from rest_framework.permissions import BasePermission


class IsInCoordinatorGroup(BasePermission):
    """
    Custom permission class to use in views.
    Checks whether the user is in 'COORDINATOR' Django Group (not the role!).
    """
    def has_permission(self, request, view):
        return request.user.groups.filter(name='COORDINATOR').exists() # always uppercase, refer to migration 0002
