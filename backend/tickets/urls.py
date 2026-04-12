from django.urls import path
from .views import BuildingsListView, FaultCategoriesListView

urlpatterns = [
    path("buildings/", BuildingsListView.as_view(), name="building-list"),
    path("categories/", FaultCategoriesListView.as_view(), name="category-list"),
]
