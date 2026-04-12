from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import Building, FaultCategory
from .serializers import BuildingSerializer, FaultCategorySerializer


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
