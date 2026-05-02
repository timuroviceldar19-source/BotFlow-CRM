#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# BotFlow CRM — Production deployment script
# Usage: ./infra/scripts/deploy.sh [--init-ssl]
# ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env"

cd "$PROJECT_ROOT"

# ── Validate .env ──
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env file not found. Copy .env.example to .env and fill in values."
    exit 1
fi

source "$ENV_FILE"

if [ "${ADMIN_API_KEY:-change-me}" = "change-me" ] || [ "${ADMIN_API_KEY:-change-me}" = "CHANGE_ME_RANDOM_32_CHARS" ]; then
    echo "ERROR: ADMIN_API_KEY is still the default value. Update it in .env"
    exit 1
fi

if [ "${POSTGRES_PASSWORD:-}" = "CHANGE_ME_STRONG_PASSWORD" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "ERROR: POSTGRES_PASSWORD is not set or still default. Update it in .env"
    exit 1
fi

echo "==> Pulling latest code..."
git pull --ff-only 2>/dev/null || echo "    (not a git repo or no remote, skipping pull)"

echo "==> Building containers..."
docker compose -f "$COMPOSE_FILE" build

echo "==> Starting services..."
docker compose -f "$COMPOSE_FILE" up -d postgres
echo "    Waiting for PostgreSQL to be healthy..."
sleep 5

docker compose -f "$COMPOSE_FILE" up -d

echo "==> Waiting for services to start..."
sleep 10

echo "==> Checking service health..."
docker compose -f "$COMPOSE_FILE" ps

# ── Optional: initial SSL setup ──
if [ "${1:-}" = "--init-ssl" ]; then
    DOMAIN="${DOMAIN:?Set DOMAIN in .env}"
    EMAIL="${CERTBOT_EMAIL:?Set CERTBOT_EMAIL in .env}"

    echo ""
    echo "==> Requesting SSL certificate for $DOMAIN..."
    docker compose -f "$COMPOSE_FILE" run --rm certbot certonly \
        --webroot \
        -w /var/www/certbot \
        -d "$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email

    echo "==> SSL certificate obtained. Update nginx config:"
    echo "    1. Uncomment HTTPS server block in infra/nginx/conf.d/default.conf"
    echo "    2. Replace YOUR_DOMAIN with $DOMAIN"
    echo "    3. Uncomment 'return 301' redirect in HTTP server"
    echo "    4. Re-run: docker compose -f docker-compose.prod.yml restart nginx"
fi

echo ""
echo "==> Deployment complete!"
echo "    Dashboard: http://${DOMAIN:-localhost}/dashboard"
echo "    API:       http://${DOMAIN:-localhost}/api/health"
