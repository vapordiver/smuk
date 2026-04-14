from rest_framework import serializers
from .models import Building, FaultCategory, Ticket, AuditLog
from users.serializers import UserShortSerializer


class BuildingSerializer(serializers.ModelSerializer):
    centroid = serializers.SerializerMethodField()

    class Meta:
        model = Building
        fields = ["id", "name", "centroid"]

    def get_centroid(self, obj):
        """
        Serialize PointField to GeoJSON format
        """

        if obj.centroid:
            return {
                "type": "Point",
                "coordinates": [obj.centroid.x, obj.centroid.y],
            }
        return None


class FaultCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FaultCategory
        fields = ["id", "name", "icon", "color"]


class AuditLogEntrySerializer(serializers.ModelSerializer):
    """
    (`AuditLogEntry` in API contract)
    """
    user = UserShortSerializer(read_only=True)
    class Meta:
        model = AuditLog
        fields = ["id", "user", "field_changed",
         "old_value", "new_value", "created_at"]

