from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    """
    Custom Admin panel for using `email` field as the default one.
    """

    # exclude username in display list
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_staff')
    
    search_fields = ('email', 'first_name', 'last_name')
    
    # sorting now by email, not username
    ordering = ('email',)

    # custom fieldsets (page layout) to exclude username
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    # add user form
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password', 'role'),
        }),
    )

admin.site.register(User, CustomUserAdmin)
