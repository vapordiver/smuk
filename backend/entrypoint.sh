#!/bin/bash
set -e

# ── Wait for PostgreSQL ──────────────────────
echo "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -q; do
  sleep 1
done
echo "PostgreSQL is ready."

# ── Conditionally Run Migrations ─────────────
if [[ "$1" == "python" ]] && [[ "$2" == "manage.py" ]] && [[ "$3" == "runserver" ]]; then
    echo "Running migrations..."
    python manage.py migrate --noinput
    echo "Loading fixtures..."
    python manage.py loaddata tickets/fixtures/initial_data.json --ignorenonexistent || echo "Fixtures already loaded or skipped."
else
    echo "Skipping migrations for command: $@"
fi

# ── Execute the main command ─────────────────
echo "Starting: $@"
exec "$@"
