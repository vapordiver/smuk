from rest_framework import generics, viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsCoordinatorOrOwner, IsInCoordinatorGroup
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
    `ticket` ViewSet for:
    `GET /api/tickets/`      (list)
    `GET /api/tickets/<id>/` (retrieve)
    `GET /api/tickets/my/`   (get_my_tickets)
    """
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = TicketFilter
    ordering_fields = ['created_at', 'priority', 'status']

    def get_serializer_class(self):
        if self.action in ['list', 'get_my_tickets']:
            return TicketListSerializer

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
