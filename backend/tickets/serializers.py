from rest_framework import serializers
from .models import Building, FaultCategory


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
