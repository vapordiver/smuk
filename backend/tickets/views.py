from rest_framework import generics, viewsets, mixins, status
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsCoordinatorOrOwner, IsInCoordinatorGroup
from .models import Building, FaultCategory, Ticket, Campus, AuditLog
from .serializers import BuildingSerializer, FaultCategorySerializer, TicketDetailSerializer, TicketListSerializer, TicketCreateSerializer, CampusSerializer, TicketUpdateSerializer
from .filters import TicketFilter
from .utils import compress_image_to_webp
from django.contrib.gis.geos import Polygon
from django.contrib.gis.db.models.functions import SnapToGrid
from django.db import transaction
from django.db.models import Count
from .tasks import calculate_priority



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


class TicketViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet, mixins.UpdateModelMixin):
    """
    `ticket` ViewSet for:
    `GET /api/tickets/`      (list)
    `GET /api/tickets/<id>/` (retrieve)
    `GET /api/tickets/my/`   (get_my_tickets)
    `POST /api/tickets/`     (create)
    `PATCH /api/tickets/<id>/` (partial_update)
    """
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = TicketFilter
    ordering_fields = ['created_at', 'priority', 'status']

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
                message = "Validation failed."
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
            return TicketUpdateSerializer

        return TicketDetailSerializer

    def get_queryset(self):
        qs = Ticket.objects.select_related('reporter', 'category', 'building', 'assigned_to')

        if self.action == 'list':
            return qs

        return qs.prefetch_related('audit_logs')

    def get_permissions(self):
        # only coordinators
        if self.action == 'list':
            return [IsAuthenticated(), IsInCoordinatorGroup()]
        elif self.action in ['update', 'partial_update']:
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

        # filtry daty i kategorii dla markerow (tak samo jak dla heatmap)
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
        Zwraca zagregowane koordynaty zgłoszeń dla heatmapy
        Filtry: ?date_from, ?date_to, ?category_id
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
        except ValueError as e:
            return Response(
                {
                    "error": {
                        "code": "IMAGE_PROCESSING_ERROR",
                        "message": str(e),
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

    def perform_update(self, serializer):
        instance = self.get_object()
        
        changes = {}
        for field, new_value in serializer.validated_data.items():
            old_value = getattr(instance, field)
            if old_value != new_value:
                changes[field] = (old_value, new_value)

        with transaction.atomic():
            updated_ticket = serializer.save()

            logs_to_create = [
                AuditLog(
                    ticket=updated_ticket,
                    user=self.request.user,
                    field_changed=field,
                    old_value=str(old_val),
                    new_value=str(new_val)
                )
                for field, (old_val, new_val) in changes.items()
            ]

            if logs_to_create:
                AuditLog.objects.bulk_create(logs_to_create)
