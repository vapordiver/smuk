from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "ticket",
        "message",
        "is_read",
        "created_at"
    )

    raw_id_fields = (
        "user",
        "ticket"
    )

    list_filter = (
        "is_read",
        "created_at"
    )

    search_fields = (
        "user__email",
        "ticket__title",
        "message"
    )

    readonly_fields = (
        "id",
        "user",
        "ticket",
        "created_at"
    )
