# How every Shipyard app is built and run when it is published.
#
# One recipe for every hosting provider. Railway, Fly.io, Cloud Run and
# DigitalOcean all build from a Dockerfile when the source has one, so an app
# runs the same way wherever it is, and moving it between providers changes
# nothing about the app (docs/ADR-008-hosting-platform.md).
#
# Slim rather than Alpine: Prisma's query engine needs OpenSSL and glibc, and
# Alpine's musl is the classic source of "works locally, crashes on deploy".
FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies first, so a code change does not reinstall them.
# Dev dependencies stay: the Prisma CLI applies the schema at start, and tsx
# runs the background worker when that component is installed.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . .
RUN npx prisma generate && npx next build

ENV NODE_ENV=production
# The provider sets PORT; 3000 is only the fallback.
ENV PORT=3000
EXPOSE 3000

CMD ["node", "scripts/start.mjs"]
