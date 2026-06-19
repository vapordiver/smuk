from rest_framework.permissions import BasePermission

class IsNotificationOwner(BasePermission):
    """
    Custom permission to only allow owners of a notification to modify it.
    """

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user
