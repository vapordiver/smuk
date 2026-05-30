import math
import re

from django.conf import settings
from rest_framework.exceptions import Throttled
from rest_framework.throttling import SimpleRateThrottle


class TicketCreateThrottle(SimpleRateThrottle):
    """
    Rate limiter dla POST /api/tickets/.
    Scope: 'ticket_create'  →  konfiguracja w DEFAULT_THROTTLE_RATES.
    Licznik przechowywany w Django cache (Redis, db=1).
    Wyłączany przez zmienną środowiskową RATE_LIMIT_ENABLED=False.

    Obsługiwany format rate: 'N/[X]unit'
      unit: s | m | h | d  (sekunda, minuta, godzina, dzień)
      X – opcjonalny mnożnik, np. '11/5min' = 11 req / 300 s
    Standardowy DRF obsługuje tylko 'N/unit' (bez mnożnika) —
    stąd nadpisanie parse_rate.
    """

    scope = 'ticket_create'

    # ------------------------------------------------------------------ #
    #  Rate parsing                                                        #
    # ------------------------------------------------------------------ #

    def parse_rate(self, rate):
        """
        Rozszerza domyślny parser DRF o mnożnik czasu.

        Przykłady:
            '11/5min'  →  (11, 300)
            '100/day'  →  (100, 86400)
            '5/m'      →  (5, 60)
        """
        if rate is None:
            return (None, None)

        num_str, period = rate.split('/')
        num_requests = int(num_str)

        match = re.fullmatch(r'(\d+)?\s*([smhd])', period.strip().lower())
        if not match:
            raise ValueError(
                f"Nieprawidłowy format throttle rate: '{rate}'. "
                "Oczekiwany: 'N/[X]unit' gdzie unit ∈ {{s,m,h,d}}, np. '11/5min'."
            )

        multiplier = int(match.group(1)) if match.group(1) else 1
        unit_seconds = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}[match.group(2)]
        duration = multiplier * unit_seconds

        return (num_requests, duration)

    # ------------------------------------------------------------------ #
    #  Cache key                                                           #
    # ------------------------------------------------------------------ #

    def get_cache_key(self, request, view):
        """Klucz per-user (pk) dla zalogowanych, per-IP dla anonimowych."""
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}

    # ------------------------------------------------------------------ #
    #  Toggle via env                                                      #
    # ------------------------------------------------------------------ #

    def allow_request(self, request, view):
        """Pomija throttling gdy RATE_LIMIT_ENABLED=False."""
        if not getattr(settings, 'RATE_LIMIT_ENABLED', True):
            return True
        return super().allow_request(request, view)

    # ------------------------------------------------------------------ #
    #  Error response                                                      #
    # ------------------------------------------------------------------ #

    def _build_error(self, wait):
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
        raise Throttled(detail={"error": self._build_error(self.wait())})
