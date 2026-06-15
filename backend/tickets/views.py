import logging
from rest_framework import generics, viewsets, mixins, status, filters
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsCoordinatorOrOwner, IsInCoordinatorGroup
from .models import Building, FaultCategory, Ticket, Campus, AuditLog, WeeklyReport
from .serializers import BuildingSerializer, FaultCategorySerializer, TicketDetailSerializer, TicketListSerializer, \
    TicketCreateSerializer, CampusSerializer, TicketUpdateSerializer, WeeklyReportSerializer, NearbyTicketSerializer
from .filters import TicketFilter
from .utils import compress_image_to_webp
from .throttles import TicketCreateThrottle
from django.contrib.gis.geos import Polygon, Point
from django.contrib.gis.db.models.functions import SnapToGrid, Distance
from django.db import transaction
from django.contrib.gis.measure import D
from django.db.models import Count, Q
from django.utils import timezone
from .tasks import calculate_priority
from datetime import timedelta

logger = logging.getLogger(__name__)


def _format_user_display(user_id):
    if not user_id:
        return None

    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.filter(pk=user_id).only('first_name', 'last_name', 'email').first()
    if not user:
        return str(user_id)

    full_name = f'{user.first_name} {user.last_name}'.strip()
    return full_name or user.email or str(user.id)


class BuildingsListView(generics.ListAPIView):
    """
    GET /api/buildings/
    Public endpoint that returns all buildings from all campuses. (id, name, centorid)
    """

    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = None


class CampusListView(generics.ListAPIView):
    """
    GET /api/campuses/
    Public endpoint that returns campus polygons for map overlay.
    """
    queryset = Campus.objects.all()
    serializer_class = CampusSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = None


class FaultCategoriesListView(generics.ListAPIView):
    """
    GET /api/categories/
    Public endpoint that returns all fault categories (id, name, icon, color)
    """

    queryset = FaultCategory.objects.all()
    serializer_class = FaultCategorySerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = None


class TicketViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, mixins.ListModelMixin, mixins.UpdateModelMixin,
                    viewsets.GenericViewSet):
    """
    `ticket` ViewSet for:
    `GET /api/tickets/`      (list)
    `GET /api/tickets/<id>/` (retrieve)
    `GET /api/tickets/my/`   (get_my_tickets)
    `POST /api/tickets/`     (create)  → throttle: at 11th ticket in 5 mins response with "Too many requests. Please try again later." with 429 
    """
    filter_backends = [DjangoFilterBackend, OrderingFilter, filters.SearchFilter]
    filterset_class = TicketFilter
    ordering_fields = ['created_at', 'priority', 'status']
    search_fields = ['title', 'description', 'id']

    def get_throttles(self):
        """Apply rate limiting only on ticket creation (POST)."""
        if self.action == 'create':
            return [TicketCreateThrottle()]
        return []

    def handle_exception(self, exc):
        response = super().handle_exception(exc)
        if isinstance(response.data, dict) and "error" not in response.data:
            code_map = {
                400: "VALIDATION_ERROR",
                401: "AUTHENTICATION_ERROR",
                403: "PERMISSION_DENIED",
                404: "NOT_FOUND",
                429: "RATE_LIMIT_EXCEEDED",
            }
            error_code = code_map.get(response.status_code, "ERROR")

            if "detail" in response.data:
                message = str(response.data["detail"])
                details = None
            else:
                # Extract the first meaningful field-level error message
                first_message = None
                for field, messages in response.data.items():
                    if isinstance(messages, list) and messages:
                        first_message = str(messages[0])
                        break
                    elif isinstance(messages, str):
                        first_message = messages
                        break
                message = first_message or "Validation failed."
                details = response.data

            body = {"code": error_code, "message": message}
            if details:
                body["details"] = details
            response.data = {"error": body}
        return response

    def get_serializer_class(self):
        if self.action in ['list', 'get_my_tickets']:
            return TicketListSerializer
        if self.action == 'create':
            return TicketCreateSerializer
        if self.action in ['update', 'partial_update']:
            from .serializers import TicketUpdateSerializer
            return TicketUpdateSerializer

        return TicketDetailSerializer

    def get_queryset(self):
        qs = Ticket.objects.select_related('reporter', 'category', 'building', 'assigned_to', 'parent_ticket')

        if self.action == 'list':
            return qs

        return qs.prefetch_related('audit_logs')

    def get_permissions(self):
        # only coordinators
        if self.action in ['list', 'update', 'partial_update']:
            return [IsAuthenticated(), IsInCoordinatorGroup()]
        # ticket detail -> object-level
        elif self.action == 'retrieve':
            return [IsAuthenticated(), IsCoordinatorOrOwner()]
        # /my/ and others -> only auth
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='my')
    def get_my_tickets(self, request):
        queryset = self.get_queryset().filter(reporter=self.request.user)
        queryset = self.filter_queryset(queryset)
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='geojson', permission_classes=[IsAuthenticated])
    def geojson(self, request):
        """
        returns ticket in geojson format to map
        optimalization: bbox (area on screen)
        filters: ?status, ?bbox, ?date_from, ?date_to, ?category_id
        """
        queryset = self.get_queryset()
        status_parameter = request.query_params.get("status")
        bbox_parameter = request.query_params.get("bbox")

        if status_parameter:
            queryset = queryset.filter(status=status_parameter)
        else:
            queryset = queryset.exclude(status__in=['CLOSED', 'ARCHIVED'])

        # polygon view on screen
        # filtered by tickets in bbox area
        if bbox_parameter:
            try:
                bbox_values = [float(v) for v in bbox_parameter.split(",")]
                if len(bbox_values) == 4:
                    bbox_poly = Polygon.from_bbox(bbox_values)
                    queryset = queryset.filter(location__intersects=bbox_poly)
            except ValueError:
                pass

        # date and category filters for markers (same as heatmap)
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        category_id = request.query_params.get('category_id')

        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        # transform to geojson format
        features = []
        for ticket in queryset:
            if not ticket.location:
                continue
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    # geodjango coord: [longitude, latitude]
                    "coordinates": [ticket.location.x, ticket.location.y]
                },
                "properties": {
                    "id": ticket.id,
                    "title": ticket.title,
                    "category": ticket.category.name if ticket.category else None,
                    "priority": ticket.priority,
                    "status": ticket.status,
                    "created_at": ticket.created_at.isoformat()
                }
            }
            features.append(feature)

        geojson_dict = {
            "type": "FeatureCollection",
            "features": features
        }

        return Response(geojson_dict)

    @action(detail=False, methods=['get'], url_path='heatmap-data', permission_classes=[IsAuthenticated])
    def heatmap_data(self, request):
        """
        GET /api/tickets/heatmap-data/
        Returns aggregated ticket coordinates for the heatmap layer
        Filters: ?date_from, ?date_to, ?category_id
        """
        qs = (Ticket.objects
              .filter(location__isnull=False)
              .exclude(status__in=['CLOSED', 'ARCHIVED']))

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        category_id = request.query_params.get('category_id')

        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if category_id:
            qs = qs.filter(category_id=category_id)

        # ~0.0001 degree ≈ 11m grid at latitude 51° (Łódź)
        GRID_SIZE = 0.0001
        aggregated = (qs
                      .annotate(grid=SnapToGrid('location', GRID_SIZE))
                      .values('grid')
                      .annotate(intensity=Count('id'))
                      .order_by())

        points = [
            {'lat': row['grid'].y, 'lng': row['grid'].x, 'intensity': row['intensity']}
            for row in aggregated
            if row['grid'] is not None
        ]

        return Response({'points': points})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # compress image (Pillow -> WEBP)
        try:
            compressed_image = compress_image_to_webp(serializer.validated_data["image"])
        except ValueError:
            logger.exception("Image processing failed during ticket creation")
            return Response(
                {
                    "error": {
                        "code": "IMAGE_PROCESSING_ERROR",
                        "message": "Unable to process the uploaded image.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            ticket = Ticket.objects.create(
                title=serializer.validated_data["title"],
                description=serializer.validated_data["description"],
                category_id=serializer.validated_data["category_id"],
                building_id=serializer.validated_data.get("building_id"),
                # floor=serializer.validated_data.get("floor"),
                # room=serializer.validated_data.get("room", ""),
                location=serializer.validated_data["_point"],
                image=compressed_image,
                reporter=request.user,
            )

            transaction.on_commit(lambda: calculate_priority.delay(ticket.id))

        output_serializer = TicketDetailSerializer(ticket)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        ticket = self.get_object()
        serializer = self.get_serializer(ticket, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        old_status = ticket.status
        old_priority = ticket.priority
        old_assigned = ticket.assigned_to_id

        self.perform_update(serializer)

        from .models import AuditLog

        if 'status' in serializer.validated_data and serializer.validated_data['status'] != old_status:
            AuditLog.objects.create(
                ticket=ticket,
                user=request.user,
                field_changed='status',
                old_value=old_status,
                new_value=serializer.validated_data['status']
            )

        if 'priority' in serializer.validated_data and serializer.validated_data['priority'] != old_priority:
            AuditLog.objects.create(
                ticket=ticket,
                user=request.user,
                field_changed='priority',
                old_value=old_priority,
                new_value=serializer.validated_data['priority']
            )

        if 'assigned_to_id' in serializer.validated_data:
            new_assigned = serializer.validated_data['assigned_to_id']
            if new_assigned != old_assigned:
                AuditLog.objects.create(
                    ticket=ticket,
                    user=request.user,
                    field_changed='assigned_to',
                    old_value=_format_user_display(old_assigned),
                    new_value=_format_user_display(new_assigned)
                )

        if 'note' in serializer.validated_data and serializer.validated_data['note']:
            AuditLog.objects.create(
                ticket=ticket,
                user=request.user,
                field_changed='note',
                new_value=serializer.validated_data['note']
            )

        # changes to pinned subtickets
        new_status = serializer.validated_data.get('status')
        new_priority = serializer.validated_data.get('priority')
        if (new_status and new_status != old_status) or (new_priority and new_priority != old_priority):
            subtickets = Ticket.objects.filter(parent_ticket=ticket)
            for subticket in subtickets:
                old_subticket_status = subticket.status
                old_subticket_priority = subticket.priority
                update_fields = ['updated_at']

                if new_status and new_status != old_status:
                    subticket.status = new_status
                    update_fields.append('status')
                    AuditLog.objects.create(
                        ticket=subticket,
                        user=request.user,
                        field_changed='status',
                        old_value=old_subticket_status,
                        new_value=new_status
                    )

                if new_priority and new_priority != old_priority:
                    subticket.priority = new_priority
                    update_fields.append('priority')
                    AuditLog.objects.create(
                        ticket=subticket,
                        user=request.user,
                        field_changed='priority',
                        old_value=old_subticket_priority,
                        new_value=new_priority
                    )

                # saving updated subticket
                subticket.save(update_fields=update_fields)

        output_serializer = TicketDetailSerializer(ticket)
        return Response(output_serializer.data)

    @action(detail=False, methods=['get'], url_path='nearby', permission_classes=[IsAuthenticated])
    def nearby(self, request):
        """
        GET /api/tickets/nearby/?lat=X&lng=Y&category_id=Z&radius=50&building_id=B
        searches for similar and OPEN tickets in the radius, parent must be in same building as presumed subticket
        """
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        category_id = request.query_params.get('category_id')
        radius = request.query_params.get('radius', 50)
        building_id = request.query_params.get('building_id')

        if not lat or not lng or not category_id:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "Missing lat, lng or category_id."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            lat = float(lat)
            lng = float(lng)
            category_id = int(category_id)
            radius = float(radius)
            if building_id:
                building_id = int(building_id)
        except ValueError:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "Invalid parameter types."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        point = Point(lng, lat, srid=4326)

        # basic filter
        filter_kwargs = {
            'category_id': category_id,
            'status__in': ['NEW', 'IN_PROGRESS', 'NEEDS_REVIEW'],
            'parent_ticket__isnull': True,
            'location__distance_lte': (point, D(m=radius))
        }

        # subticket in the same building or outside buildings
        if building_id:
            filter_kwargs['building_id'] = building_id
        else:
            filter_kwargs['building__isnull'] = True

        # ONLY OPEN TICKETS AND NOT SUBTICKETS, FILTERED BY SAME BUILDINGS
        queryset = self.get_queryset().filter(**filter_kwargs).annotate(
            distance=Distance('location', point)
        ).order_by('distance')

        serializer = NearbyTicketSerializer(queryset, many=True, context={'request': request})

        return Response({
            "count": queryset.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='confirm-duplicate', permission_classes=[IsAuthenticated])
    def confirm_duplicate(self, request, pk=None):
        """
        POST /api/tickets/<id>/confirm-duplicate/
        confirms pinning the duplicate ticket
        """
        parent_ticket = self.get_object()

        if parent_ticket.parent_ticket_id is not None:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Subticket cannot be a parent ticket."
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        new_ticket_data = request.data.get('new_ticket_data')

        if not new_ticket_data:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "Field new_ticket_data is required."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # subticket validation
        serializer = TicketCreateSerializer(data=new_ticket_data)
        # image not needed in duplicate
        serializer.fields['image'].required = False
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        # additional category check with parent ticket
        if validated_data['category_id'] != parent_ticket.category_id:
            return Response(
                {"error": {"code": "VALIDATION_ERROR",
                           "message": "Subticket category is different from parent ticket category."}},
                status=status.HTTP_400_BAD_REQUEST)

        # additional distance check to parent ticket
        point = validated_data['_point']
        if parent_ticket.location:
            is_close_to_parent = Ticket.objects.filter(
                pk=parent_ticket.pk,
                location__distance_lte=(point, D(m=50))
            ).exists()
            if not is_close_to_parent:
                return Response(
                    {"error": {"code": "VALIDATION_ERROR",
                               "message": "Location of the ticket is too great to be pinned as a subticket."}},
                    status=status.HTTP_400_BAD_REQUEST)

        # pinning the ticket without the img, cosiek add AI here my compadre
        with transaction.atomic():
            child_ticket = Ticket.objects.create(
                title=validated_data.get('title', parent_ticket.title),
                description=validated_data['description'],
                category_id=validated_data['category_id'],
                location=parent_ticket.location,
                building=parent_ticket.building,
                priority=parent_ticket.priority,
                reporter=request.user,
                parent_ticket=parent_ticket,
                status=parent_ticket.status
            )

        # change needed here after addition of AI check
        return Response({
            "message": "Successfully pinned this ticket as a subticket.",
            "parent_ticket_id": parent_ticket.id,
            "child_ticket_id": child_ticket.id,
            "verification_status": "CONFIRMED_MANUALLY"
        }, status=status.HTTP_201_CREATED)


class WeeklyReportListView(generics.ListAPIView):
    """
    GET /api/reports/weekly/
    Read-only endpoint for the coordinator dashboard.
    Returns all weekly reports ordered by newest first.
    """
    queryset = WeeklyReport.objects.all()
    serializer_class = WeeklyReportSerializer
    permission_classes = [IsAuthenticated, IsInCoordinatorGroup]


class StatsViewSet(viewsets.ViewSet):
    """
    ViewSet for dashboard and personal stats.
    GET /api/stats/dashboard/
    GET /api/stats/my/
    """

    def get_permissions(self):
        if self.action == 'dashboard':
            return [IsAuthenticated(), IsInCoordinatorGroup()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        # Count statistics for coordinator
        total_tickets = Ticket.objects.count()
        open_count = Ticket.objects.exclude(status__in=['RESOLVED', 'CLOSED', 'ARCHIVED']).count()
        in_progress_count = Ticket.objects.filter(status='IN_PROGRESS').count()
        resolved_count = Ticket.objects.filter(status='RESOLVED').count()
        closed_count = Ticket.objects.filter(status='CLOSED').count()
        this_week_count = Ticket.objects.filter(created_at__gte=week_ago).count()
        # Recent activity - fetch last 5 status changes
        recent_logs = AuditLog.objects.select_related('ticket', 'user').filter(
            field_changed='status'
        ).order_by('-created_at')[:5]
        # Recent activity - fetch last 5 tickets created
        recent_tickets = Ticket.objects.select_related('reporter').order_by('-created_at')[:5]
        combined_activity = []
        for log in recent_logs:
            user_data = None
            if log.user:
                user_data = {
                    "first_name": log.user.first_name,
                    "last_name": log.user.last_name
                }
            combined_activity.append({
                "type": "status_changed",
                "ticket_id": log.ticket.id,
                "ticket_title": log.ticket.title,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "user": user_data,
                "timestamp": log.created_at, #for sort
            })
        for ticket in recent_tickets:
            user_data = None
            if ticket.reporter:
                user_data = {"first_name": ticket.reporter.first_name, "last_name": ticket.reporter.last_name}
                combined_activity.append({
                    "type": "ticket_created",
                    "ticket_id": ticket.id,
                    "ticket_title": ticket.title,
                    "old_value": None,
                    "new_value": ticket.status,
                    "user": user_data,
                    "timestamp": ticket.created_at
                })
        combined_activity.sort(key=lambda x: x['timestamp'], reverse=True)
        top_activity = combined_activity[:5]
        for item in top_activity:
            item["created_at"] = item.pop("timestamp").isoformat()
        return Response({
            "total_tickets": total_tickets,
            "open_count": open_count,
            "in_progress_count": in_progress_count,
            "resolved_count": resolved_count,
            "closed_count": closed_count,
            "this_week_count": this_week_count,
            "recent_activity": top_activity
        })

    @action(detail=False, methods=['get'], url_path='my')
    def my(self, request):
        # Personal statistics for the currently logged user
        qs = Ticket.objects.filter(reporter=request.user)
        stats = qs.aggregate(
            total_tickets=Count('id'),
            new_count=Count('id', filter=Q(status='NEW')),
            in_progress_count=Count('id', filter=Q(status='IN_PROGRESS')),
            resolved_count=Count('id', filter=Q(status='RESOLVED')),
            closed_count=Count('id', filter=Q(status='CLOSED')),
            needs_review_count=Count('id', filter=Q(status='NEEDS_REVIEW')),
            open_count=Count('id', filter=~Q(status__in=['RESOLVED', 'CLOSED', 'ARCHIVED']))
        )
        return Response(stats)
