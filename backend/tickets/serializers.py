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


class TicketListSerializer(serializers.ModelSerializer):
    """
    (`TicketListItem` in API contract)
    """
    category = FaultCategorySerializer(read_only=True)
    building = BuildingSerializer(read_only=True)
    reporter = UserShortSerializer(read_only=True)

    class Meta:
        model = Ticket
        fields = ["id", "title", "status", "priority", "category",
        "building", "reporter", "image", "created_at"]


class TicketDetailSerializer(serializers.ModelSerializer):
    """
    (`TicketDetail` in API contract)
    """
    # mapping audit_log (API contract) -> audit_logs (model relationship)
    audit_log = AuditLogEntrySerializer(source="audit_logs", many=True, read_only=True)
    category = FaultCategorySerializer(read_only=True)
    building = BuildingSerializer(read_only=True)
    location = serializers.SerializerMethodField()
    reporter = UserShortSerializer(read_only=True)
    assigned_to = UserShortSerializer(read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "description", "category", "building",
            "floor", "room", "status", "priority", "location", "image", 
            "reporter", "assigned_to", "parent_ticket", "created_at", 
            "updated_at", 
            "audit_log" 
        ]

    def get_location(self, obj):
        """
        Serialize location PointField to GeoJSON format
        """

        if obj.location:
            return {
                "type": "Point",
                "coordinates": [obj.location.x, obj.location.y],
            }
        return None
