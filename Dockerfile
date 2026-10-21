FROM node:22-bookworm

# Bun only installs the lockfile. Next 16 crashes under Bun on Linux
# (worker_threads SIGTRAP), so Node performs the build and serves the app.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-venv \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g bun@1.2.19

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CONVEX_SITE_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL \
    NEXT_PUBLIC_CONVEX_SITE_URL=$NEXT_PUBLIC_CONVEX_SITE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN cd apps/web \
    && node /app/node_modules/next/dist/bin/next build \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt gunicorn \
    && chmod +x /app/scripts/party-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/scripts/party-entrypoint.sh"]
