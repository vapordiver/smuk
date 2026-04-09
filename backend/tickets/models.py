from django.db import models
from django.conf import settings
from django.conrtib.gis.db import models as gis_models

# Create your models here.

# TODO: zarejestrowac apke na koniec!!!
class Ticket(models.Model):
    class Status(models.TextChoices):
        NEW = 'new', 'New'
        IN_PROGRESS = 'in_progress', 'In_progress'
        NEEDS_REVIEW = 'needs_review', 'Needs_review'
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
    floor = models.IntegerField(blank=True)
    room = models.CharField(max_length=20, blank=True)
    location = gis_models.PointField(srid=4326) # SRID=4326 (WGS84) -> GPS
    image = models.ImageField(upload_to='tickets/', blank=True, null=True)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=model.CASCADE)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    parent_ticket = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


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
    pass
    # ticket fk
    # user fk
    # field_changed
    # old_value
    # new_value
    # created_at


class Comment(models.Model):
    pass
    # ticket fk
    # user fk
    # text
    # created at
 

