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
        building_a10 = Building.objects.filter(name__icontains='A10').first()
        building_c3 = Building.objects.filter(name__icontains='C3').first()
        # B18 building fallback to A1 if missing
        building_b18 = Building.objects.filter(name__icontains='B18').first() or Building.objects.filter(name__icontains='A1').first()

        category_green = FaultCategory.objects.filter(name='Zieleń i trawniki').first()
        category_elec = FaultCategory.objects.filter(name='Oświetlenie i elektryka').first()
        category_road = FaultCategory.objects.filter(name='Nawierzchnia i drogi').first()
        category_infra = FaultCategory.objects.filter(name='Mała architektura i ogrodzenia').first()

        # Abort if required foreign keys are missing 
        if not building_a10 or not building_c3 or not category_elec or not category_green or not category_road or not category_infra:
            raise CommandError(
                "Missing Building or FaultCategory in the database! "
                "Please create them first before running this script."
            )

        # 4. Create Tickets
        # Ticket 1 (Reporter 1) - A10 Oświetlenie i elektryka
        t1 = Ticket.objects.create(
            title="Uszkodzona latarnia przy wejściu",
            description="Latarnia zewnętrzna przy wejściu głównym do budynku A10 nie świeci, przez co po zmroku jest zupełnie ciemno i niebezpiecznie.",
            location=building_a10.centroid,
            building=building_a10,
            category=category_elec,
            reporter=reporter1,
            priority=Ticket.Priority.HIGH,
            status=Ticket.Status.NEW
        )

        # Ticket 2 (Reporter 1, assigned to Coordinator) - C3 Zieleń i trawniki
        t2 = Ticket.objects.create(
            title="Powalone drzewo blokujące przejście",
            description="Po wczorajszej burzy duże drzewo przewróciło się na chodnik i blokuje przejście pieszych w pobliżu budynku C3.",
            location=building_c3.centroid,
            building=building_c3,
            category=category_green,
            reporter=reporter1,
            assigned_to=coordinator1,
            priority=Ticket.Priority.MEDIUM,
            status=Ticket.Status.IN_PROGRESS
        )

        # Ticket 3 (Reporter 2) - B18 Nawierzchnia i drogi
        t3 = Ticket.objects.create(
            title="Głębokie uszkodzenie nawierzchni drogi",
            description="Na drodze dojazdowej w pobliżu budynku B18 powstał głęboki ubytek w asfalcie, stwarzający zagrożenie dla pojazdów.",
            location=building_b18.centroid,
            building=building_b18,
            category=category_road,
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
