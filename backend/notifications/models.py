from django.db import models
from django.conf import settings

class Notification(models.Model):
    """
    Notification model used for tracking Ticket status changes
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        blank=False,
        null=False,
        related_name="notifications"
    )

    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        blank=False,
        null=False,
        related_name="notifications"
    )

    message = models.TextField()
    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "is_read", "-created_at"],
                name="notification_user_unread_idx"
            ),
        ]

    def __str__(self):
        return f"({self.user}) {self.ticket} - {self.message}"
