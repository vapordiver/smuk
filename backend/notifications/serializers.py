from rest_framework import serializers
from tickets.serializers import TicketShortSerializer

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    ticket = TicketShortSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "ticket", "message", "is_read", "created_at"]


class NotificationMarkReadSerializer(serializers.ModelSerializer):
    """
    Mini-serializer used to mark notification as already read
    """

    class Meta:
        model = Notification
        fields = ["is_read"]
