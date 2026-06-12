import django_filters
from .models import Notification

class NotificationFilter(django_filters.FilterSet):
    """
    FilterSet for the Notification model.  
    Support query params in accordance with API contract:  
    is_read
    """
    is_read = django_filters.BooleanFilter(field_name="is_read")

    class Meta:
        model = Notification
        fields = ["is_read"]
