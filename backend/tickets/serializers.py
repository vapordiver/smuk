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
            "id", "title", "description", "status", "priority", "category",
            "building", "floor", "room", "reporter", "location", "image", "created_at"
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
    Serializer used when creating a new ticket (POST /api/tickets/).
    Accepts multipart/form-data with image + text fields + GPS coordinates.
    """
    title = serializers.CharField(max_length=100)
    description = serializers.CharField(min_length=10)
    category_id = serializers.IntegerField()
    building_id = serializers.IntegerField(required=False)
    #floor = serializers.IntegerField(required=False)
    #room = serializers.CharField(required=False)
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    image = serializers.ImageField()

    def validate_image(self, value):
        """
        Validate image size (max 10MB) and file type (JPEG/PNG only).
        """
        if value.size > 10 * 1024 * 1024: # 10MB
            raise serializers.ValidationError("Image file too large (max 10MB).")
        
        allowed_types = ['image/jpeg', 'image/png']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Only JPEG and PNG images are allowed.")
        
        return value

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
        Cross-field validation:
        1. Check if GPS location is within any campus polygon (geofencing).
        2. If building_id provided, check if location is within 300m of the building polygon.
        
        Uses PostGIS ST_DWithin with D(m=300) for accurate distance calculation in meters,
        regardless of latitude (unlike raw degree comparison).
        """
        lat = attrs.get("latitude")
        lng = attrs.get("longitude")
        if lat is None or lng is None:
            return attrs

        point = Point(lng, lat, srid=4326)
        
        # geofencing: check if location is within campus boundaries
        is_on_campus = Campus.objects.filter(polygon__contains=point).exists()
        
        if not is_on_campus:
            raise serializers.ValidationError({
                "location": "Location is outside campus boundaries."
            })
        
        # if building is provided, check proximity (max 300m)
        building_id = attrs.get("building_id")
        if building_id:
            try:
                building = Building.objects.get(pk=building_id)
                if building.polygon:
                    is_close = Building.objects.filter(
                        pk=building_id, 
                        polygon__distance_lte=(point, D(m=300))
                    ).exists()
                else:
                    is_close = Building.objects.filter(
                        pk=building_id,
                        centroid__distance_lte=(point, D(m=300))
                    ).exists()
                    
                if not is_close:
                    raise serializers.ValidationError({
                        "location": "Location is too far from selected building (max 300m)."
                    })
            except Building.DoesNotExist:
                pass
                
        attrs["_point"] = point

        return attrs
