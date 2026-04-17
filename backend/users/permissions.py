from rest_framework.permissions import BasePermission


# per-request memoization
def _is_coordinator(user):
    if not hasattr(user, '_is_coordinator_cached'):
        user._is_coordinator_cached = user.groups.filter(name='COORDINATOR').exists() # always uppercase, refer to migration 0002
    return user._is_coordinator_cached


class IsInCoordinatorGroup(BasePermission):
    """
    Custom permission class to use in views.
    Checks whether the user is in 'COORDINATOR' Django Group (not the role!).
    """
    def has_permission(self, request, view):
        return _is_coordinator(request.user) 


class IsCoordinatorOrOwner(BasePermission):
    """
    Object-level permission.
    Checks whether the user is in the 'COORDINATOR' Django Group
    or is the owner (reporter) of the ticket.

    NOTE: DRF only calls has_object_permission() when
    view.get_object() is used (e.g. retrieve, update).
    It is NOT called for list actions — use separate
    permissions for those.
    """
    def has_object_permission(self, request, view, obj):
        is_coordinator = _is_coordinator(request.user)
        is_owner = request.user == obj.reporter

        return is_coordinator or is_owner
