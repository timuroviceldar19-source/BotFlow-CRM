#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# BotFlow CRM — PostgreSQL restore from backup
# Usage: ./infra/scripts/restore.sh backups/botflow_crm_20260401_030000.sql.gz
# ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

POSTGRES_DB="${POSTGRES_DB:-botflow_crm}"
POSTGRES_USER="${POSTGRES_USER:-botflow}"

BACKUP_FILE="${1:?Usage: restore.sh <backup-file.sql.gz>}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will DROP and recreate the database '$POSTGRES_DB'."
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo "==> Stopping bot-api and web..."
docker compose -f "$COMPOSE_FILE" stop bot-api web

echo "==> Dropping and recreating database..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS $POSTGRES_DB;" \
    -c "CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;"

echo "==> Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" --quiet

echo "==> Running migrations..."
docker compose -f "$COMPOSE_FILE" run --rm bot-api \
    alembic -c alembic.ini upgrade head

echo "==> Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo "==> Restore complete!"
