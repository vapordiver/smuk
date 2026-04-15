import django_filters
from .models import Ticket


class TicketFilter(django_filters.FilterSet):
    """
    Special filter class used for `tickets` model.
    """
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='date__lte')

    category_id = django_filters.NumberFilter(field_name='category_id')
    building_id = django_filters.NumberFilter(field_name='building__id')

    class Meta:
        model = Ticket
        fields = {
            'status': ['exact'],
            'priority': ['exact'],
        }
