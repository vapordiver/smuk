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
    python manage.py loaddata tickets/fixtures/categories.json --ignorenonexistent || echo "Categories already loaded or skipped."
    python manage.py loaddata tickets/fixtures/buildings.json --ignorenonexistent || echo "Buildings already loaded or skipped."
    python manage.py loaddata tickets/fixtures/campuses.json --ignorenonexistent || echo "Campuses already loaded or skipped."
    echo "Generating test users..."
    python manage.py generate_test_tickets || echo "Test users already exist or skipped."
else
    echo "Skipping migrations for command: $@"
fi

# ── Execute the main command ─────────────────
echo "Starting: $@"
exec "$@"
