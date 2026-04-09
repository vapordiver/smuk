from django.db import models
from django.conf import settings
from django.contrib.gis.db import models as gis_models

# Create your models here.

# TODO: zarejestrowac apke na koniec!!!
class Ticket(models.Model):
    class Status(models.TextChoices):
        NEW = 'new', 'New'
        IN_PROGRESS = 'in_progress', 'In Progress'
        NEEDS_REVIEW = 'needs_review', 'Needs Review'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'
        ARCHIVED =  'archived', 'Archived'

    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    title = models.CharField(max_length=20)
    description = models.TextField()
    # category (fk)
    # building (fk, nullable)
    floor = models.IntegerField(blank=True, null=True)
    room = models.CharField(max_length=20, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.LOW)

    location = gis_models.PointField(srid=4326) # SRID=4326 (WGS84) -> GPS
    image = models.ImageField(upload_to='tickets/', blank=True)

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='reported_tickets'
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='assigned_tickets'
    )

    parent_ticket = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='sub_tickets'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.status})"


class Building(models.Model):
    pass
    # id
    # name
    # centroid

class FaultCategory(models.Model):
    pass
    # id
    # name
    # icon?
    # color


class AuditLog(models.Model):
    ticket = models.ForeignKey(
        'Ticket',
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )

    field_changed = models.CharField(max_length=50)
    old_value = models.CharField(max_length=255, null=True, blank=True)
    new_value = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ticket.title} - {self.field_changed} ({self.created_at})"


class Comment(models.Model):
    ticket = models.ForeignKey(
        'Ticket',
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='comments'
    )

    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user} on {self.ticket.title}"[:50]
