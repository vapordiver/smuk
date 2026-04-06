from rest_framework.permissions import BasePermission


class IsInCoordinatorGroup(BasePermission):
    def has_permission(self, request, view):
        return request.user.groups.filter(name='COORDINATORS').exists() # always uppercase, refer to migration 0002
