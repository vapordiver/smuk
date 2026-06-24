from .views import TicketViewSet, WeeklyReportListView, WeeklyReportExportView, BuildingsListView, FaultCategoriesListView, CampusListView, StatsViewSet
from django.urls import path
from rest_framework.routers import DefaultRouter
from django.urls import include


router = DefaultRouter()
router.register(r"tickets", TicketViewSet, basename="ticket")
router.register(r"stats", StatsViewSet, basename="stats")

urlpatterns = [
    path("buildings/", BuildingsListView.as_view(), name="building-list"),
    path("campuses/", CampusListView.as_view(), name="campus-list"),
    path("categories/", FaultCategoriesListView.as_view(), name="category-list"),
    path("reports/weekly/", WeeklyReportListView.as_view(), name="weekly-report-list"),
    path("reports/weekly/<int:pk>/export/", WeeklyReportExportView.as_view(), name="weekly-report-export"),
    path("", include(router.urls)),
]
