# SMUK
SMUK - System Monitorowania Usterek Kampusu

## Budowanie obrazów od zera (gdy dodasz nowe biblioteki w requirements.txt)
docker compose up --build

## Start w tle
docker compose up -d

## Restart jednego serwisu np. backendu
docker compose restart *backend*

## Logi konkretnego serwisu np. backendu
docker compose logs -f backend

## Wejście do shella Django (test kodu na żywo)
docker compose exec backend python manage.py shell

## Tworzenie nowej aplikacji Django
docker compose exec backend python manage.py startapp nazwa_aplikacji

## Stop wszystkiego
docker compose down

## Stop + usunięcie wolumenów (UWAGA: czyści bazę danych!)
docker compose down -v

## Dostępność paneli
  - Panel Django: http://localhost:8000 (/admin na koncu panel admina)
  - Panel React: http://localhost:5173

