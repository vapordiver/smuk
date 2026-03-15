# ── Base image ────────────────────────────────
FROM node:20-alpine

# ── Workdir ───────────────────────────────────
WORKDIR /app

# ── Layer caching: install Node deps first ────
COPY package.json package-lock.json* ./
RUN npm install

# ── Copy project source ──────────────────────
COPY . .

# ── Expose Vite dev server port ───────────────
EXPOSE 5173

# ── Start Vite dev server (accessible externally) ─
CMD ["npm", "run", "dev", "--", "--host"]
