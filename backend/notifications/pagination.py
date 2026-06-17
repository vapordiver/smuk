from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response

from .models import Notification

class NotificationPagination(LimitOffsetPagination):
    """
    Pagination class for Notification model in accordance with API contract
    """
    def get_paginated_response(self, data):
        unread_count = Notification.objects.filter(
            user=self.request.user,
            is_read=False
        ).count()

        return Response({
            "count": self.count,
            "unread_count": unread_count,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data
        })
