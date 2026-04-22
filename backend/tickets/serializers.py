from rest_framework import serializers
from .models import Building, FaultCategory, Ticket, AuditLog, Campus
from users.serializers import UserShortSerializer
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D


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
        fields = [
            "id", "user", "field_changed",
            "old_value", "new_value", "created_at"
        ]


class TicketListSerializer(serializers.ModelSerializer):
    """
    (`TicketListItem` in API contract)
    """
    category = FaultCategorySerializer(read_only=True)
    building = BuildingSerializer(read_only=True)
    reporter = UserShortSerializer(read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "status", "priority", "category",
            "building", "reporter", "image", "created_at"
        ]


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

class TicketCreateSerializer(serializers.Serializer):
    """
    Serializer used when creating a new ticket
    """
    title = serializers.CharField()
    description = serializers.CharField(min_length=10)
    category_id = serializers.IntegerField()
    building_id = serializers.IntegerField(required=False)
    #floor = serializers.IntegerField(required=False)
    #room = serializers.CharField(required=False)
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    image = serializers.ImageField()

    def validate_category_id(self, value):
        """
        Validate that cateogry exists in database
        """
        if not FaultCategory.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Category with this ID does not exist.")
        return value

    def validate_building_id(self, value):
        """
        Validate that building exists in database (if provided)
        """
        if value is not None and not Building.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Building with this ID does not exist.")
        return value

    def validate(self, attrs):
        """
        Validate that location is within campus boundaries.
        If building provided and validated, check that location is within building boundaries.
        """
        lat = attrs.get("latitude")
        lng = attrs.get("longitude")
        if lat is None or lng is None:
            return attrs

        point = Point(lng, lat, srid=4326)
        
        # check if location is within campus boundaries
        is_on_campus = Campus.objects.filter(polygon__contains=point).exists()
        
        if not is_on_campus:
            raise serializers.ValidationError({
                "location": "Location is outside campus boundaries."
            })
        
        # if building is provided, check if location is within building boundaries (max 300m tolerance)
        building_id = attrs.get("building_id")
        if building_id:
            try:
                building = Building.objects.get(pk=building_id)
                if building.polygon:
                    # max 300m tolerance
                    is_close = Building.objects.filter(
                        pk=building_id, 
                        polygon__dwithin=(point, D(m=300))
                    ).exists()
                    
                    if not is_close:
                        raise serializers.ValidationError({
                            "location": "Location is too far from selected building (max 300m)."
                        })
            except Building.DoesNotExist:
                pass
                
        attrs["_point"] = point

        return attrs