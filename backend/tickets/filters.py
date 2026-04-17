import django_filters
from .models import Ticket


class TicketFilter(django_filters.FilterSet):
    """
    FilterSet for the Ticket model. 
    Supports query params aligned with the OpenAPI contract:
    category_id, building_id, status, priority, date_from, date_to.
    """
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='date__lte')

    category_id = django_filters.NumberFilter(field_name='category_id')
    building_id = django_filters.NumberFilter(field_name='building_id')

    class Meta:
        model = Ticket
        fields = {
            'status': ['exact'],
            'priority': ['exact'],
        }
