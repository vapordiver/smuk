from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import Ticket, Building, FaultCategory, AuditLog, Campus

# Custom admin display for 'tickets' app models.


@admin.register(FaultCategory)
class FaultCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "color")
    readonly_fields = ("id",)


@admin.register(Building)
class BuildingAdmin(GISModelAdmin):
    list_display = ("name",)
    search_fields = ("id", "name")
    readonly_fields = ("id",)


@admin.register(Campus)
class CampusAdmin(GISModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)
    readonly_fields = ("id",)


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "category",
        "building",
        "status",
        "priority",
        "reporter",
        "created_at",
    )

    # right-side filters
    list_filter = ("status", "priority", "category", "building", "created_at")

    search_fields = ("title", "description", "reporter__email")

    # quick-edit
    list_editable = ("status", "priority")

    readonly_fields = ("id", "created_at", "updated_at")

    # formatting
    fieldsets = (
        (
            "General Info",
            {"fields": ("id", "title", "description", "image", "parent_ticket")},
        ),
        (
            "Status & Assignment",
            {"fields": ("status", "priority", "reporter", "assigned_to")},
        ),
        (
            "Location Data",
            {"fields": ("category", "building", "floor", "room", "location")},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "ticket",
        "user",
        "field_changed",
        "old_value",
        "new_value",
        "created_at",
    )
    list_filter = ("field_changed", "created_at")

    # audit log should not be edited
    # but for debugging and testing
    # you can uncomment the lines below

    # """

    readonly_fields = (
        "ticket",
        "user",
        "field_changed",
        "old_value",
        "new_value",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    # """
