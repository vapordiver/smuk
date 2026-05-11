from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.contrib.gis.measure import D
from .models import Ticket, AuditLog

@shared_task
def calculate_priority(ticket_id):
    try:
        ticket = Ticket.objects.get(id=ticket_id)
    except Ticket.DoesNotExist:
        return
    
    if ticket.priority != Ticket.Priority.LOW:
        return

    seven_days_ago = ticket.created_at - timedelta(days=7)
    
    similar_tickets_count = Ticket.objects.filter(
        category=ticket.category,
        created_at__gte=seven_days_ago,
        created_at__lte=ticket.created_at,
        location__distance_lte=(ticket.location, D(m=100))
    ).count()

    new_priority = ticket.priority
    if similar_tickets_count >= 5:
        new_priority = Ticket.Priority.HIGH
    elif similar_tickets_count >= 3:
        new_priority = Ticket.Priority.MEDIUM
    
    if new_priority != ticket.priority:
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
