import math
import re

from django.conf import settings
from rest_framework.exceptions import Throttled
from rest_framework.throttling import SimpleRateThrottle


class TicketCreateThrottle(SimpleRateThrottle):
    """
    Rate limiter for POST /api/tickets/.
    Scope: 'ticket_create'  →  configured in DEFAULT_THROTTLE_RATES.
    Counter stored in Django cache (Redis, db=1).
    Can be disabled via the RATE_LIMIT_ENABLED=False environment variable.

    Supported rate format: 'N/[X]unit'
      unit: s | m | h | d  (second, minute, hour, day)
      X – optional multiplier, e.g. '11/5min' = 11 req / 300 s
    Standard DRF only supports 'N/unit' (without multiplier) —
    hence the parse_rate override.
    """

    scope = 'ticket_create'

    # ------------------------------------------------------------------ #
    #  Rate parsing                                                        #
    # ------------------------------------------------------------------ #

    def parse_rate(self, rate):
        """
        Extends the default DRF parser with a time multiplier.

        Examples:
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
                f"Invalid throttle rate format: '{rate}'. "
                "Expected: 'N/[X]unit' where unit ∈ {{s,m,h,d}}, e.g. '11/5min'."
            )

        multiplier = int(match.group(1)) if match.group(1) else 1
        unit_seconds = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}[match.group(2)]
        duration = multiplier * unit_seconds

        return (num_requests, duration)

    # ------------------------------------------------------------------ #
    #  Cache key                                                           #
    # ------------------------------------------------------------------ #

    def get_cache_key(self, request, view):
        """Per-user (pk) key for authenticated users, per-IP for anonymous."""
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}

    # ------------------------------------------------------------------ #
    #  Toggle via env                                                      #
    # ------------------------------------------------------------------ #

    def allow_request(self, request, view):
        """Bypasses throttling when RATE_LIMIT_ENABLED=False."""
        if not getattr(settings, 'RATE_LIMIT_ENABLED', True):
            return True
        return super().allow_request(request, view)

    # ------------------------------------------------------------------ #
    #  Error response                                                      #
    # ------------------------------------------------------------------ #

    def _build_error(self, wait):
        """Builds a human-readable error dict returned when the rate limit is exceeded."""
        wait_seconds = math.ceil(wait) if wait is not None else 300
        minutes, seconds = divmod(wait_seconds, 60)

        if minutes > 0:
            wait_human = f"{minutes} min {seconds} s" if seconds else f"{minutes} min"
        else:
            wait_human = f"{wait_seconds} s"

        return {
            "code": "RATE_LIMIT_EXCEEDED",
            "message": (
                "You have exceeded the submission limit. "
                f"Please try again in {wait_human}."
            ),
            "retry_after_seconds": wait_seconds,
        }

    def throttle_failure(self):
        """Called by DRF when the throttle returns False — raises Throttled."""
        raise Throttled(detail={"error": self._build_error(self.wait())})
