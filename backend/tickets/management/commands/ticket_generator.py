from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from tickets.models import Building, FaultCategory, Ticket
from django.utils import timezone
from datetime import timedelta
import random

User = get_user_model()


class Command(BaseCommand):
    help = "Generuje 100 losowych ticketów"

    TICKETS_BY_CATEGORY = {
        "Zieleń i trawniki": [
            "Nieskoszona trawa",
            "Uszkodzone drzewo",
            "Zanieczyszczony trawnik",
        ],
        "Oświetlenie i elektryka": [
            "Niedziałająca latarnia",
            "Uszkodzona skrzynka elektryczna",
            "Migające światło",
        ],
        "Nawierzchnia i drogi": [
            "Dziura w chodniku",
            "Uszkodzony krawężnik",
            "Zapadnięta kostka",
        ],
        "Mała architektura i ogrodzenia": [
            "Uszkodzona ławka",
            "Przepełniony kosz",
            "Pęknięte ogrodzenie",
        ],
    }

    DESCRIPTIONS = {
        "Nieskoszona trawa": "Trawa w tym obszarze jest bardzo wysoka i wymaga skoszenia.",
        "Uszkodzone drzewo": "Połamane gałęzie drzewa zagrażają przechodniom po ostatniej burzy.",
        "Zanieczyszczony trawnik": "Na trawniku zalega duża ilość liści i śmieci.",
        "Niedziałająca latarnia": "Latarnia zewnętrzna nie świeci po zmroku.",
        "Uszkodzona skrzynka elektryczna": "Drzwiczki skrzynki rozdzielczej na zewnątrz są otwarte i wystają kable.",
        "Migające światło": "Zewnętrzne oświetlenie nad wejściem do budynku miga i utrudnia widoczność.",
        "Dziura w chodniku": "Zauważono głęboką dziurę w płytkach chodnikowych, można się potknąć.",
        "Uszkodzony krawężnik": "Krawężnik przy drodze dojazdowej jest ukruszony i wystaje.",
        "Zapadnięta kostka": "Kostka brukowa na parkingu zapadła się, tworząc głęboką kałużę.",
        "Uszkodzona ławka": "Ławka parkowa ma złamane deski i wystające gwoździe.",
        "Przepełniony kosz": "Kosz na śmieci przy alejce jest całkowicie przepełniony, odpady wysypują się na ziemię.",
        "Pęknięte ogrodzenie": "Panel ogrodzeniowy przy granicy kampusu jest wygięty i uszkodzony.",
    }

    CATEGORY_IMAGES = {
        "Zieleń i trawniki": "ogrod.jpg",
        "Oświetlenie i elektryka": "elektryka.jpg",
        "Nawierzchnia i drogi": "drogi.webp",
        "Mała architektura i ogrodzenia": "mala.avif",
    }

    def handle(self, *args, **kwargs):
        import os
        from io import BytesIO
        from django.core.files import File

        reporter = User.objects.filter(
            email="reporter1@edu.p.lodz.pl"
        ).first()

        if not reporter:
            raise CommandError(
                "Nie znaleziono użytkownika reporter1@edu.p.lodz.pl"
            )

        coord = User.objects.filter(
            email="coord1@p.lodz.pl"
        ).first()

        if not coord:
            raise CommandError("Nie znaleziono użytkownika coord1@p.lodz.pl")

        buildings = list(Building.objects.all())
        if not buildings:
            raise CommandError("Brak budynków.")

        categories = list(FaultCategory.objects.all())
        if not categories:
            raise CommandError("Brak kategorii.")

        # Pre-load seed images from fixtures/seed_images/
        seed_images_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'fixtures', 'seed_images')
        loaded_images = {}
        for cat_name, filename in self.CATEGORY_IMAGES.items():
            filepath = os.path.join(seed_images_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, 'rb') as f:
                    loaded_images[cat_name] = (filename, f.read())
                self.stdout.write(f"  Załadowano obraz: {filename}")
            else:
                self.stdout.write(self.style.WARNING(f"  Brak pliku: {filepath}"))

        if not loaded_images:
            raise CommandError("Nie znaleziono żadnych plików obrazów w katalogu fixtures/seed_images/.")

        created = 0
        now = timezone.now()

        for i in range(100):
            category = random.choice(categories)
            possible_titles = self.TICKETS_BY_CATEGORY.get(
                category.name,
                ["Inna usterka"]
            )
            title = random.choice(possible_titles)
            selected_building = random.choice(buildings)
            days_ago = random.randint(0,180)
            ticket_date = now - timedelta(days=days_ago)

            ticket = Ticket(
                title=title,
                description=self.DESCRIPTIONS.get(
                    title,
                    "Wymagana interwencja techniczna."
                ),
                building=selected_building,
                category=category,
                reporter=reporter,
                assigned_to=coord,
                location=selected_building.centroid,
                priority=Ticket.Priority.LOW,
                status=random.choice([
                    Ticket.Status.NEW,
                    Ticket.Status.IN_PROGRESS,
                    Ticket.Status.RESOLVED,
                ]),
            )

            # Save image through Django storage API (works with both local and S3)
            img_filename, img_bytes = loaded_images.get(
                category.name,
                list(loaded_images.values())[0]
            )
            ticket.image.save(img_filename, File(BytesIO(img_bytes)), save=False)
            ticket.save()

            #auto_now_add forces current data so just update it
            Ticket.objects.filter(pk=ticket.pk).update(created_at=ticket_date, updated_at=ticket_date)

            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Utworzono {created} ticketów."
            )
        )