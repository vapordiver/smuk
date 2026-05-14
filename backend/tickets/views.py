import logging

from rest_framework import generics, viewsets, mixins, status, filters
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from users.permissions import IsCoordinatorOrOwner, IsInCoordinatorGroup
from .models import Building, FaultCategory, Ticket
from .serializers import BuildingSerializer, FaultCategorySerializer, TicketDetailSerializer, TicketListSerializer, TicketCreateSerializer
from .filters import TicketFilter
from .utils import compress_image_to_webp
from .tasks import calculate_priority

logger = logging.getLogger(__name__)


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


class TicketViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """
    `ticket` ViewSet for:
    `GET /api/tickets/`      (list)
    `GET /api/tickets/<id>/` (retrieve)
    `GET /api/tickets/my/`   (get_my_tickets)
    `POST /api/tickets/`     (create)
    """
    filter_backends = [DjangoFilterBackend, OrderingFilter, filters.SearchFilter]
    filterset_class = TicketFilter
    ordering_fields = ['created_at', 'priority', 'status']
    search_fields = ['title', 'description', 'id']

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
            from .serializers import TicketUpdateSerializer
            return TicketUpdateSerializer

        return TicketDetailSerializer

    def get_queryset(self):
        qs = Ticket.objects.select_related('reporter', 'category', 'building', 'assigned_to')

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
                    old_value=str(old_assigned) if old_assigned else None,
                    new_value=str(new_assigned) if new_assigned else None
                )

        if 'note' in serializer.validated_data and serializer.validated_data['note']:
            AuditLog.objects.create(
                ticket=ticket,
                user=request.user,
                field_changed='note',
                new_value=serializer.validated_data['note']
            )

        output_serializer = TicketDetailSerializer(ticket)
        return Response(output_serializer.data)
