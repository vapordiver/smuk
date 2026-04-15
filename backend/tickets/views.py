from rest_framework import generics, viewsets
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import AllowAny
from .models import Building, FaultCategory, Ticket
from .serializers import BuildingSerializer, FaultCategorySerializer, TicketDetailSerializer, TicketListSerializer
from .filters import TicketFilter


class BuildingsListView(generics.ListAPIView):
    """
    GET /api/buildings/
    Public endpoint that returns all buildings from all campuses. (id, name, centorid)
    """

    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    permission_classes = [AllowAny]
    pagination_class = None


class FaultCategoriesListView(generics.ListAPIView):
    """
    GET /api/categories/
    Public endpoint that returns all fault categories (id, name, icon, color)
    """

    queryset = FaultCategory.objects.all()
    serializer_class = FaultCategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None


class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    """
    `ticket` ViewSet for List or Retrieve
    GET /api/tickets/      (list)
    GET /api/tickets/{id}/ (retrieve)
    """
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = TicketFilter
    ordering_fields = ['created_at', 'priority', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return TicketListSerializer

        return TicketDetailSerializer

    def get_queryset(self):
        qs = Ticket.objects.select_related('reporter', 'category', 'building', 'assigned_to')
        
        if self.action == 'list':
            return qs

        return qs.prefetch_related('audit_logs')
