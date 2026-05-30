from django.conf import settings
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.exceptions import Throttled
import math


class TicketCreateThrottle(ScopedRateThrottle):
    """
    ScopedRateThrottle dla POST /api/tickets/.
    Scope: 'ticket_create'  →  konfiguracja w DEFAULT_THROTTLE_RATES.
    Licznik przechowywany w Django cache (Redis).
    Wyłączany przez zmienną środowiskową RATE_LIMIT_ENABLED=False.
    """

    scope = 'ticket_create'

    def allow_request(self, request, view):
        """Pomija throttling gdy RATE_LIMIT_ENABLED=False."""
        if not getattr(settings, 'RATE_LIMIT_ENABLED', True):
            return True
        return super().allow_request(request, view)

    def throttle_failure_detail(self, request, wait):
        """Buduje czytelny słownik błędu zwracany przy przekroczeniu limitu."""
        wait_seconds = math.ceil(wait) if wait is not None else 300
        minutes, seconds = divmod(wait_seconds, 60)

        if minutes > 0:
            wait_human = f"{minutes} min {seconds} s" if seconds else f"{minutes} min"
        else:
            wait_human = f"{wait_seconds} s"

        return {
            "code": "RATE_LIMIT_EXCEEDED",
            "message": (
                "Przekroczyłeś limit zgłoszeń. "
                f"Spróbuj ponownie za {wait_human}."
            ),
            "retry_after_seconds": wait_seconds,
        }

    def throttle_failure(self):
        """Wywoływane przez DRF kiedy throttle zwraca False – rzuca Throttled."""
        wait = self.wait()
        raise Throttled(detail={"error": self.throttle_failure_detail(None, wait)})
