from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer used in /api/auth/register/ endpoint
    """

    # only for validation purposes
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'password', 'password_confirm', 'role']

        # id & role are only returned from response
        read_only_fields = ['id', 'role']

        # first_name and last_name are required and cannot be blank
        extra_kwargs = {
            'password': {'write_only': True},
            'first_name': {
                'required': True,
                'allow_blank': False,
                'error_messages': {
                    'blank': 'First name cannot be blank.',
                    'required': 'First name is required.'
                }
            },
            'last_name': {
                'required': True,
                'allow_blank': False,
                'error_messages': {
                    'blank': 'Last name cannot be blank.',
                    'required': 'Last name is required.'
                }
            }
        }

    def validate_email(self, value):
        allowed_domains = ['@edu.p.lodz.pl', '@p.lodz.pl']

        if not any(value.lower().endswith(domain) for domain in allowed_domains):
            raise serializers.ValidationError("Email address should belong to the @edu.p.lodz.pl or @p.lodz.pl domain.")

        return value

    def validate_password(self, value):
        """
        Use Django's built-in password validator.
        To change the behaviour, go to settings.py and modify AUTH_PASSWORD_VALIDATORS list
        """
        try:
            validate_password(value)
        except exceptions.ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')

        # create_user() hashes password and normalizes email
        user = User.objects.create_user(**validated_data)

        try:
            group = Group.objects.get(name=user.role.upper()) # always uppercase, refer to migration 0002
            user.groups.add(group)
        except Group.DoesNotExist:
            logger.error(f'ERROR: Group {user.role.upper()} does not exist!')
            user.delete()
            raise serializers.ValidationError(
                {"detail": "Server Error: User cannot be added to the group. Contact the administrator."}
            )

        return user

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer used in /api/auth/me/ endpoint.
    """
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']
