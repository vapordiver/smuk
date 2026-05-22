from celery import shared_task
from datetime import timedelta
from django.contrib.gis.measure import D
from .models import Ticket, AuditLog

PRIORITY_WINDOW_DAYS = 7
PRIORITY_RADIUS_METERS = 100
HIGH_PRIORITY_THRESHOLD = 5
MEDIUM_PRIORITY_THRESHOLD = 3


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
