from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.gis.geos import Point
from django.db import transaction
from tickets.models import Building, FaultCategory, Ticket, AuditLog


User = get_user_model()


class Command(BaseCommand):
    help = 'Generates test data: Users, Tickets, and AuditLogs for testing permissions.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Generating test data...")

        # Emails specifically reserved for this script
        script_emails = [
            'reporter1@edu.p.lodz.pl',
            'reporter2@edu.p.lodz.pl',
            'coord1@p.lodz.pl'
        ]

        # Cleanup from previous script runs.
        # Deleting specific users will safely cascade and delete their Tickets and AuditLogs 
        # without affecting other real users or data from other scripts.
        total_deleted, deleted_details = User.objects.filter(email__in=script_emails).delete()
        
        users_deleted = deleted_details.get(User._meta.label, 0)
        
        self.stdout.write(
            f"Cleaned up old script data ({users_deleted} users and {total_deleted - users_deleted} "
            f"related objects deleted)..."
        )

        # 1. Fetch or Create Groups
        coordinator_group, _ = Group.objects.get_or_create(name='COORDINATOR')
        reporter_group, _    = Group.objects.get_or_create(name='REPORTER')

        # 2. Create Users via Manager (to properly hash passwords using CustomUserManager)
        strong_password = 'SecurePass123!'

        reporter1 = User.objects.create_user(
            email=script_emails[0], 
            password=strong_password,
            first_name='Jan', 
            last_name='Kowalski',
            role=User.Role.REPORTER
        )

        reporter2 = User.objects.create_user(
            email=script_emails[1], 
            password=strong_password,
            first_name='Anna', 
            last_name='Nowak',
            role=User.Role.REPORTER
        )

        coordinator1 = User.objects.create_user(
            email=script_emails[2], 
            password=strong_password,
            first_name='Adam', 
            last_name='Adminowski',
            role=User.Role.COORDINATOR 
        )

        # Add users to their respective groups based on permissions setup
        coordinator1.groups.add(coordinator_group)
        reporter1.groups.add(reporter_group)
        reporter2.groups.add(reporter_group)

        # 3. Fetch dependencies (Building, Category)
        building = Building.objects.first()
        category = FaultCategory.objects.first()
        point1 = Point(19.9123, 50.0654, srid=4326)

        # Abort if required foreign keys are missing 
        if not building or not category:
            raise CommandError(
                "Missing Building or FaultCategory in the database! "
                "Please create them first before running this script."
            )

        # 4. Create Tickets
        # Ticket 1 (Reporter 1)
        t1 = Ticket.objects.create(
            title="Cieknący kran w C-4",
            description="Całą noc kapie woda.",
            location=point1,
            building=building,
            category=category,
            reporter=reporter1,
            priority=Ticket.Priority.MEDIUM,
            status=Ticket.Status.NEW
        )

        # Ticket 2 (Reporter 1, assigned to Coordinator)
        t2 = Ticket.objects.create(
            title="Problem z projektorem",
            description="Lampa mruga na żółto.",
            location=point1,
            building=building,
            category=category,
            reporter=reporter1,
            assigned_to=coordinator1,
            priority=Ticket.Priority.HIGH,
            status=Ticket.Status.IN_PROGRESS
        )

        # Ticket 3 (Reporter 2 - should be hidden from Reporter 1 based on Permissions)
        t3 = Ticket.objects.create(
            title="Wybita szyba",
            description="Rozbite okno na parterze.",
            location=point1,
            building=building,
            category=category,
            reporter=reporter2,
            priority=Ticket.Priority.CRITICAL,
            status=Ticket.Status.NEW
        )

        # 5. Generate an AuditLog simulating user assignment/status change
        AuditLog.objects.create(
            ticket=t2,
            user=coordinator1,
            field_changed="status",
            old_value="NEW",
            new_value="IN_PROGRESS"
        )

        if settings.DEBUG:
            self.stdout.write(self.style.SUCCESS("Test data generated successfully!"))
            self.stdout.write("--- LOGIN CREDENTIALS ---")
            self.stdout.write(f"1. {reporter1.email} (Reporter) pw: {strong_password}")
            self.stdout.write(f"2. {reporter2.email} (Reporter) pw: {strong_password}")
            self.stdout.write(f"3. {coordinator1.email} (Coordinator) pw: {strong_password}")
            self.stdout.write("------------------------------------")
