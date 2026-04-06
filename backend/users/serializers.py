from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']

        extra_kwargs = {'password': {'write_only': True}}


    def create(self, validated_data):
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
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']
