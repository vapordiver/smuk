import logging
from io import BytesIO
from celery import shared_task
from datetime import timedelta
from django.contrib.gis.measure import D
from django.core.files.base import ContentFile
from django.utils import timezone
from PIL import Image
from .models import Ticket, AuditLog

logger = logging.getLogger(__name__)

PRIORITY_WINDOW_DAYS = 7
PRIORITY_RADIUS_METERS = 100
HIGH_PRIORITY_THRESHOLD = 5
MEDIUM_PRIORITY_THRESHOLD = 3

COMPRESS_OLDER_THAN_DAYS = 30
ARCHIVE_OLDER_THAN_DAYS = 365
ARCHIVED_QUALITY = 60
ARCHIVED_QUALITY_MARKER = "_q60"
BATCH_CHUNK_SIZE = 100

@shared_task
def calculate_priority(ticket_id):
    try:
        ticket = Ticket.objects.get(id=ticket_id)
    except Ticket.DoesNotExist:
        return
    
    if ticket.priority != Ticket.Priority.LOW:
        return

    if not ticket.location:
        return

    window_start = ticket.created_at - timedelta(days=PRIORITY_WINDOW_DAYS)
    
    similar_tickets_count = Ticket.objects.filter(
        category=ticket.category,
        created_at__gte=window_start,
        created_at__lt=ticket.created_at,
        location__distance_lte=(ticket.location, D(m=PRIORITY_RADIUS_METERS))
    ).count()

    if similar_tickets_count >= HIGH_PRIORITY_THRESHOLD:
        new_priority = Ticket.Priority.HIGH
    elif similar_tickets_count >= MEDIUM_PRIORITY_THRESHOLD:
        new_priority = Ticket.Priority.MEDIUM
    else:
        return

    old_priority = ticket.priority
    ticket.priority = new_priority
    ticket.save(update_fields=['priority', 'updated_at'])

    AuditLog.objects.create(
        ticket=ticket,
        user=None,
        field_changed="priority",
        old_value=old_priority,
        new_value=new_priority,
    )


@shared_task
def compress_old_images():
    """
    Recompresses ticket images older than COMPRESS_OLDER_THAN_DAYS to WEBP at
    ARCHIVED_QUALITY (60%). Idempotent via ARCHIVED_QUALITY_MARKER in filename.
    Bypasses ImageField.save() (which would re-run upload_to and lose the marker).
    """
    threshold = timezone.now() - timedelta(days=COMPRESS_OLDER_THAN_DAYS)

    queryset = Ticket.objects.filter(
        created_at__lt=threshold,
    ).exclude(image="")

    processed = 0
    for ticket in queryset.iterator(chunk_size=BATCH_CHUNK_SIZE):
        try:
            old_name = ticket.image.name
            if not old_name:
                continue

            # skip already-recompressed images
            if ARCHIVED_QUALITY_MARKER in old_name:
                continue

            with ticket.image.open("rb") as src:
                img = Image.open(src)
                img.load()

            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            buffer = BytesIO()
            img.save(buffer, format="WEBP", quality=ARCHIVED_QUALITY)
            buffer.seek(0)

            base_name = old_name.rsplit("/", 1)[-1].rsplit(".", 1)[0]
            new_name_only = f"{base_name}{ARCHIVED_QUALITY_MARKER}.webp"

            if "/" in old_name:
                directory = old_name.rsplit("/", 1)[0]
            else:
                directory = ""

            if directory:
                new_relative_name = f"{directory}/{new_name_only}"
            else:
                new_relative_name = new_name_only

            # bypass ImageField.save() (which re-runs upload_to and would discard the marker '_q60')
            saved_name = ticket.image.storage.save(
                new_relative_name,
                ContentFile(buffer.read()),
            )

            ticket.image.name = saved_name
            ticket.save(update_fields=["image", "updated_at"])

            if old_name != saved_name and ticket.image.storage.exists(old_name):
                ticket.image.storage.delete(old_name)

            processed += 1

        except Exception as exc:
            logger.exception(
                "compress_old_images: failed to recompress ticket %s (%s)",
                ticket.id,
                exc,
            )
            continue

    logger.info("compress_old_images: recompressed %s tickets", processed)


@shared_task
def archive_old_tickets():
    """
    Archives tickets older than ARCHIVE_OLDER_THAN_DAYS that are not ARCHIVED yet.
    Each status change is recorded in AuditLog.
    """
    threshold = timezone.now() - timedelta(days=ARCHIVE_OLDER_THAN_DAYS)

    queryset = Ticket.objects.filter(
        created_at__lt=threshold,
    ).exclude(status=Ticket.Status.ARCHIVED)

    processed = 0
    for ticket in queryset.iterator(chunk_size=BATCH_CHUNK_SIZE):
        try:
            old_status = ticket.status
            ticket.status = Ticket.Status.ARCHIVED
            ticket.save(update_fields=["status", "updated_at"])

            AuditLog.objects.create(
                ticket=ticket,
                user=None,
                field_changed="status",
                old_value=old_status,
                new_value=Ticket.Status.ARCHIVED,
            )

            processed += 1

        except Exception as exc:
            logger.exception(
                "archive_old_tickets: failed to archive ticket %s (%s)",
                ticket.id,
                exc,
            )
            continue

    logger.info("archive_old_tickets: archived %s tickets", processed)
