from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import NotificationFilter
from .models import Notification
from .pagination import NotificationPagination
from .permissions import IsNotificationOwner
from .serializers import NotificationMarkReadSerializer, NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Read-only endpoint for listing notifications
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend]
    filterset_class = NotificationFilter

    pagination_class = NotificationPagination

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related("ticket")


class NotificationMarkReadView(generics.UpdateAPIView):
    """
    PATCH /api/notifications/<id>/read/
    Endpoint to mark a specific notification as read.
    """

    serializer_class = NotificationMarkReadSerializer

    permission_classes = [IsAuthenticated, IsNotificationOwner]

    http_method_names = ["patch", "options", "head"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def update(self, request, *args, **kwargs):
        # Accept only PATCH
        kwargs["partial"] = True

        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Save object, is_read=True
        self.perform_update(serializer)

        full_serializer = NotificationSerializer(instance)

        return Response(full_serializer.data)

    def perform_update(self, serializer):
        serializer.save(is_read=True)

class NotificationReadAllView(views.APIView):
    """
    PATCH /api/notifications/read-all/
    Marks all unread notifications of the logged-in user as read.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        # Get all user's unread notifications
        unread_notifications = Notification.objects.filter(
            user=request.user,
            is_read=False
        )

        updated_count = unread_notifications.update(is_read=True)

        return Response(
            {
                "message": "All notifications marked as read.",
                "updated_count": updated_count
            },
            status=status.HTTP_200_OK
        )
