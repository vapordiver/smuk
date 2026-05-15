from .views import TicketViewSet
from django.urls import path
from .views import BuildingsListView, FaultCategoriesListView, CampusListView
from rest_framework.routers import DefaultRouter
from django.urls import include


router = DefaultRouter()
router.register(r"tickets", TicketViewSet, basename="ticket")

urlpatterns = [
    path("buildings/", BuildingsListView.as_view(), name="building-list"),
    path("campuses/", CampusListView.as_view(), name="campus-list"),
    path("categories/", FaultCategoriesListView.as_view(), name="category-list"),
    path("", include(router.urls)),
]
