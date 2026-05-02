#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# BotFlow CRM — Health monitoring script
# Usage: ./infra/scripts/healthcheck.sh
# Cron:  */5 * * * * /path/to/infra/scripts/healthcheck.sh >> /var/log/botflow-crm-health.log 2>&1
# ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

DOMAIN="${DOMAIN:-localhost}"
BASE_URL="http://${DOMAIN}"
ALERT_FAILURES=0
TIMESTAMP="[$(date)]"

check_endpoint() {
    local name="$1"
    local url="$2"
    local expected="${3:-200}"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "$expected" ]; then
        echo "$TIMESTAMP OK   $name ($url) → $HTTP_CODE"
    else
        echo "$TIMESTAMP FAIL $name ($url) → $HTTP_CODE (expected $expected)"
        ALERT_FAILURES=$((ALERT_FAILURES + 1))
    fi
}

echo "$TIMESTAMP ── Health check starting ──"

# Check API health
check_endpoint "API /health" "${BASE_URL}/health"

# Check landing page
check_endpoint "Landing /" "${BASE_URL}/"

# Check dashboard
check_endpoint "Dashboard" "${BASE_URL}/dashboard"

# Check Docker containers
RUNNING=$(docker compose -f "$COMPOSE_FILE" ps --status running --format "{{.Name}}" 2>/dev/null | wc -l)
EXPECTED=4  # postgres, bot-api, web, nginx

if [ "$RUNNING" -ge "$EXPECTED" ]; then
    echo "$TIMESTAMP OK   Docker containers: $RUNNING running (expected $EXPECTED)"
else
    echo "$TIMESTAMP FAIL Docker containers: $RUNNING running (expected $EXPECTED)"
    ALERT_FAILURES=$((ALERT_FAILURES + 1))

    echo "$TIMESTAMP Container status:"
    docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || echo "    Could not get container status"
fi

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "$TIMESTAMP WARN Disk usage at ${DISK_USAGE}%"
    ALERT_FAILURES=$((ALERT_FAILURES + 1))
else
    echo "$TIMESTAMP OK   Disk usage: ${DISK_USAGE}%"
fi

echo "$TIMESTAMP ── Health check done: $ALERT_FAILURES failures ──"

# ── Exit with error if any check failed (useful for monitoring tools) ──
if [ "$ALERT_FAILURES" -gt 0 ]; then
    exit 1
fi
