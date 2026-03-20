# ── Base image ────────────────────────────────
FROM python:3.12-slim

# ── Environment variables ─────────────────────
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# ── System deps for GeoDjango (GDAL, GEOS, PROJ) ─
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    postgresql-client \
    sed \
    && rm -rf /var/lib/apt/lists/*

# ── Workdir ───────────────────────────────────
WORKDIR /app

# ── Layer caching: install Python deps first ──
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy project source ──────────────────────
COPY . .

# ── Make entrypoint executable ────────────────
RUN sed -i 's/\r$//' /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# ── Expose Django dev server port ─────────────
EXPOSE 8000
