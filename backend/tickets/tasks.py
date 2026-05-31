import logging
import time
import requests
from io import BytesIO
from celery import shared_task
from datetime import timedelta
from django.contrib.gis.measure import D
from django.core.files.base import ContentFile
from django.utils import timezone
from django.db.models import Count
from django.conf import settings
from PIL import Image
from .models import Ticket, AuditLog, WeeklyReport

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


@shared_task
def generate_weekly_report():
    """
    Aggregates ticket data from the last 7 days and generates an AI summary
    via Hugging Face API. Falls back to raw_stats only on any failure.
    """
    now = timezone.now()
    week_start = now - timedelta(days=7)
    week_end = now

    # --- 1. Aggregate stats ---
    created_count = Ticket.objects.filter(
        created_at__gte=week_start,
        created_at__lte=week_end,
    ).count()

    resolved_count = Ticket.objects.filter(
        updated_at__gte=week_start,
        updated_at__lte=week_end,
        status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED],
    ).count()

    pending_count = Ticket.objects.exclude(
        status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED, Ticket.Status.ARCHIVED],
    ).count()

    top_category_row = (
        Ticket.objects.filter(
            created_at__gte=week_start,
            created_at__lte=week_end,
            category__isnull=False,
        )
        .values("category__id", "category__name")
        .annotate(count=Count("id"))
        .order_by("-count")
        .first()
    )

    top_building_row = (
        Ticket.objects.filter(
            created_at__gte=week_start,
            created_at__lte=week_end,
            building__isnull=False,
        )
        .values("building__id", "building__name")
        .annotate(count=Count("id"))
        .order_by("-count")
        .first()
    )

    raw_stats = {
        "total_created": created_count,
        "total_resolved": resolved_count,
        "total_open": pending_count,
        "top_category": {
            "id": top_category_row["category__id"],
            "name": top_category_row["category__name"],
            "count": top_category_row["count"],
        } if top_category_row else None,
        "top_building": {
            "id": top_building_row["building__id"],
            "name": top_building_row["building__name"],
            "count": top_building_row["count"],
        } if top_building_row else None,
    }

    # --- 2. Call Hugging Face API ---
    content = None
    api_key = getattr(settings, "HUGGINGFACE_API_KEY", None)

    if api_key:
        hf_url = "https://router.huggingface.co/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        top_cat_name = top_category_row["category__name"] if top_category_row else "N/A"
        top_bld_name = top_building_row["building__name"] if top_building_row else "N/A"

        prompt = (
            f"You are an assistant that writes concise weekly reports for a campus fault-reporting system. "
            f"Here are the stats for the past 7 days:\n"
            f"- New tickets created: {created_count}\n"
            f"- Resolved/closed tickets: {resolved_count}\n"
            f"- Currently pending tickets: {pending_count}\n"
            f"- Top category: {top_cat_name}\n"
            f"- Top building: {top_bld_name}\n\n"
            f"Write a short, professional weekly summary report in Polish."
        )

        payload = {
            "model" : "Qwen/Qwen2.5-7B-Instruct",
            "messages" : [{"role": "user", "content" : prompt}],
            "max_tokens": 250,
            "temperature" : 0.3,
        }

        for attempt in range(3):
            try:
                response = requests.post(
                    hf_url, headers=headers, json=payload, timeout=60
                )

                if response.status_code == 503:
                    logger.warning(
                        "generate_weekly_report: HF API returned 503 (model loading), "
                        "retrying in 30s (attempt %d/3)", attempt + 1,
                    )
                    time.sleep(30)
                    continue

                response.raise_for_status()
                result = response.json()

                if "choices" in result and len(result["choices"]) > 0:
                    content = result["choices"][0]["message"].get("content", "")
                else:
                    logger.warning(
                        "generate_weekly_report: unexpected HF API response format: %s",
                        result,
                    )
                break

            except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
                logger.exception(
                    "generate_weekly_report: HF API request failed (attempt %d/3): %s",
                    attempt + 1, exc,
                )
                if attempt < 2:
                    time.sleep(30)
                continue
    else:
        logger.info(
            "generate_weekly_report: HUGGINGFACE_API_KEY not set, skipping AI generation."
        )

    # --- 3. Save report (always succeeds) ---
    report = WeeklyReport.objects.create(
        week_start=week_start,
        week_end=week_end,
        content=content,
        raw_stats=raw_stats,
    )

    logger.info(
        "generate_weekly_report: created report id=%s, content=%s",
        report.id,
        "generated" if content else "fallback (raw_stats only)",
    )
    return report.id
