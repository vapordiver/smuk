from rest_framework import serializers
from .models import Building, FaultCategory, Ticket, AuditLog, Campus, WeeklyReport
from users.serializers import UserShortSerializer
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.contrib.auth import get_user_model
import uuid


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


class CampusSerializer(serializers.ModelSerializer):
    polygon = serializers.SerializerMethodField()

    class Meta:
        model = Campus
        fields = ["id", "name", "polygon"]

    def get_polygon(self, obj):
        """Serialize PolygonField to GeoJSON format"""
        if obj.polygon:
            coords = [list(point) for point in obj.polygon.coords[0]]
            return {"type": "Polygon", "coordinates": [coords]}
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

    def _resolve_assigned_user(self, value):
        if not value:
            return value

        try:
            uuid.UUID(str(value))
        except (TypeError, ValueError):
            return value

        User = get_user_model()
        user = User.objects.filter(pk=value).only("first_name", "last_name", "email").first()
        if not user:
            return value

        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name or user.email or str(user.id)

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if instance.field_changed == "assigned_to":
            data["old_value"] = self._resolve_assigned_user(data.get("old_value"))
            data["new_value"] = self._resolve_assigned_user(data.get("new_value"))

        return data


class ParentTicketShortSerializer(serializers.ModelSerializer):
    """
    Mini-serializer to fetch basic details of the parent ticket
    """

    class Meta:
        model = Ticket
        fields = ["id", "status", "image", "title"]


class TicketListSerializer(serializers.ModelSerializer):
    """
    (`TicketListItem` in API contract)
    """
    category = FaultCategorySerializer(read_only=True)
    building = BuildingSerializer(read_only=True)
    reporter = UserShortSerializer(read_only=True)
    assigned_to = UserShortSerializer(read_only=True)
    audit_log = AuditLogEntrySerializer(source="audit_logs", many=True, read_only=True)
    parent_details = ParentTicketShortSerializer(source="parent_ticket", read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "description", "status", "priority", "category",
            "building", "floor", "room", "reporter", "assigned_to", "location", "image", "created_at", "audit_log",
            "parent_ticket", "parent_details"
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
    parent_details = ParentTicketShortSerializer(source="parent_ticket", read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "description", "category", "building",
            "floor", "room", "status", "priority", "location", "image",
            "reporter", "assigned_to", "parent_ticket", "parent_details", "created_at",
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
    # floor = serializers.IntegerField(required=False)
    # room = serializers.CharField(required=False)
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    image = serializers.ImageField()

    def validate_image(self, value):
        """
        Validate image size (max 10MB) and file type (JPEG/PNG only).
        """
        if value.size > 10 * 1024 * 1024:  # 10MB
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


class TicketUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer used for updating ticket status, priority, and assigned_to (PATCH /api/tickets/<id>/).
    """
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Ticket
        fields = ["status", "priority", "assigned_to_id", "note"]

    def validate_assigned_to_id(self, value):
        from django.contrib.auth import get_user_model
        if value is not None:
            User = get_user_model()
            if not User.objects.filter(pk=value).exists():
                raise serializers.ValidationError("User with this ID does not exist.")
        return value


class NearbyTicketSerializer(serializers.ModelSerializer):
    """
    Serializer used to get nearby tickets, used for checking duplicate reports.
    """
    category = FaultCategorySerializer(read_only=True)
    distance = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = ["id", "title", "description", "image", "status", "category", "distance", "created_at"]

    def get_distance(self, obj):
        if hasattr(obj, "distance") and obj.distance is not None:
            try:
                dist_in_meters = obj.distance.m
            except AttributeError:
                # If postgis returns distance in DEGREES (SOMEHOW POSSIBLE) recalc to meters
                dist_in_meters = obj.distance * 111320
            return round(dist_in_meters, 2)
        return None
class WeeklyReportSerializer(serializers.ModelSerializer):
    week_start = serializers.SerializerMethodField()
    week_end = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyReport
        fields = ["id", "week_start", "week_end", "content", "raw_stats", "created_at"]

    def get_week_start(self, obj):
        return obj.week_start.date().isoformat()

    def get_week_end(self, obj):
        return obj.week_end.date().isoformat()
