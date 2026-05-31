from django.db import models
from django.conf import settings
from django.contrib.gis.db import models as gis_models
from django.utils import timezone
from django.core.validators import RegexValidator
import uuid
from django.utils.translation import gettext_lazy as _

def ticket_image_upload_path(instance, filename):
    """
    generates unique file path for ticket images (local / S3)
    format: tickets/YYYY/MM/DD/uuid4.webp
    """
    ext = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    now = timezone.now()
    return f"tickets/{now.year}/{now.month:02d}/{now.day:02d}/{new_filename}"



class FaultCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=10)
    color = models.CharField(
        max_length=7,
        validators=[
            RegexValidator(
                regex="^#[0-9a-fA-F]{6}$",
                message="Color must be in hex format (e.g. #FFFFFF)",
                code="invalid_color",
            )
        ],
    )

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Building(models.Model):
    name = models.CharField(max_length=100, unique=True)

    polygon = gis_models.PolygonField(srid=4326, blank=True, null=True)
    centroid = gis_models.PointField(srid=4326)  # SRID=4326 (WGS84) -> GPS

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Ticket(models.Model):
    class Status(models.TextChoices):
        NEW = "NEW", "New"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        NEEDS_REVIEW = "NEEDS_REVIEW", "Needs Review"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"
        ARCHIVED = "ARCHIVED", "Archived"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    title = models.CharField(max_length=100)
    description = models.TextField()

    category = models.ForeignKey(
        "FaultCategory",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="tickets",
    )

    building = models.ForeignKey(
        "Building",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="tickets",
    )

    floor = models.IntegerField(blank=True, null=True)
    room = models.CharField(max_length=20, blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW, db_index=True
    )
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.LOW, db_index=True
    )

    location = gis_models.PointField(srid=4326)  # SRID=4326 (WGS84) -> GPS
    image = models.ImageField(upload_to=ticket_image_upload_path, blank=False)

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reported_tickets",
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assigned_tickets",
    )

    parent_ticket = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="sub_tickets",
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class AuditLog(models.Model):
    """
    Tracks life-cycle changes of Ticket fields.
    Log generation should be handled at the View layer
    whenever Ticket data is modified.
    """

    ticket = models.ForeignKey(
        "Ticket", on_delete=models.CASCADE, related_name="audit_logs"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
    )

    field_changed = models.CharField(max_length=50)

    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.ticket.title} - {self.field_changed} ({self.created_at})"

class Campus(models.Model):
    """
    Represents a campus
    """
    name = models.CharField(max_length=100, unique=True)
    polygon = gis_models.PolygonField(srid=4326)

    class Meta:
        verbose_name = 'Campus'
        verbose_name_plural = 'Campuses'

    def __str__(self):
        return self.name

class WeeklyReport(models.Model):
    week_start = models.DateTimeField(verbose_name=_("Początek tygodnia"))
    week_end = models.DateTimeField(verbose_name=_("Koniec tygodnia"))
    content = models.TextField(blank=True, null=True, verbose_name=_("Wygenerowany raport AI"))
    raw_stats = models.JSONField(default=dict, verbose_name=_("Surowe Statystyki JSON"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Utworzono"))

    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Raport tygodniowy: {self.week_start.date()} – {self.week_end.date()}"
