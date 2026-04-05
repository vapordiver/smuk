from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid


class User(AbstractUser):
    class Role(models.TextChoices):
        REPORTER = 'reporter', 'Reporter'
        COORDINATOR = 'coordinator', 'Coordinator'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.REPORTER)
