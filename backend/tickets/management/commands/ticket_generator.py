from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from tickets.models import Building, FaultCategory, Ticket
import random

User = get_user_model()


class Command(BaseCommand):
    help = "Generuje 100 losowych ticketów"

    TICKETS_BY_CATEGORY = {
        "Instalacja wodna": [
            "Pęknięta rura",
            "Kapiący kran",
            "Brak wody w kranie",
        ],
        "Elektryka": [
            "Spalona żarówka",
            "Niedziałające gniazdko",
            "Brak prądu",
        ],
        "Ogrzewanie": [
            "Brak ogrzewania",
            "Uszkodzone pokrętło do zmiany temperatury",
        ],
    }

    DESCRIPTIONS = {
        "Pęknięta rura": "Zauważono wyciek wody z instalacji.",
        "Kapiący kran": "Kran przecieka i wymaga naprawy.",
        "Brak wody w kranie": "Po odkręceniu kranu nie leci woda.",
        "Spalona żarówka": "Oświetlenie nie działa.",
        "Niedziałające gniazdko": "Gniazdko nie dostarcza zasilania.",
        "Brak prądu": "W pomieszczeniu nie ma zasilania.",
        "Brak ogrzewania": "Pomieszczenie pozostaje zimne.",
        "Uszkodzone pokrętło do zmiany temperatury": "Nie można regulować temperatury.",
    }

    def handle(self, *args, **kwargs):

        reporter = User.objects.filter(
            email="coord1@p.lodz.pl"
        ).first()

        if not reporter:
            raise CommandError(
                "Nie znaleziono użytkownika coord1@p.lodz.pl"
            )

        buildings = list(Building.objects.all())
        if not buildings:
            raise CommandError("Brak budynków.")

        categories = list(FaultCategory.objects.all())
        if not categories:
            raise CommandError("Brak kategorii.")

        created = 0

        for i in range(100):

            category = random.choice(categories)

            possible_titles = self.TICKETS_BY_CATEGORY.get(
                category.name,
                ["Inna usterka"]
            )

            title = random.choice(possible_titles)

            ticket = Ticket.objects.create(
                title=title,
                description=self.DESCRIPTIONS.get(
                    title,
                    "Wymagana interwencja techniczna."
                ),
                building=random.choice(buildings),
                category=category,
                reporter=reporter,
                assigned_to=reporter,
                location=random.choice(buildings).centroid,
                priority=random.choice([
                    Ticket.Priority.LOW,
                    Ticket.Priority.MEDIUM,
                    Ticket.Priority.HIGH,
                    Ticket.Priority.CRITICAL,
                ]),
                status=random.choice([
                    Ticket.Status.NEW,
                    Ticket.Status.IN_PROGRESS,
                    Ticket.Status.RESOLVED,
                ]),
            )

            created += 1

            #self.stdout.write(
            #    f"[{created}/100] Ticket #{ticket.id}: {ticket.title}"
            #)

        self.stdout.write(
            self.style.SUCCESS(
                f"Utworzono {created} ticketów."
            )
        )