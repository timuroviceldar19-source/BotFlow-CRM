#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# BotFlow CRM — PostgreSQL backup script
# Usage: ./infra/scripts/backup.sh
# Cron:  0 3 * * * /path/to/infra/scripts/backup.sh >> /var/log/botflow-crm-backup.log 2>&1
# ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env"

BACKUP_DIR="$PROJECT_ROOT/backups"
KEEP_DAYS=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ── Load env ──
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

POSTGRES_DB="${POSTGRES_DB:-botflow_crm}"
POSTGRES_USER="${POSTGRES_USER:-botflow}"

# ── Create backup dir ──
mkdir -p "$BACKUP_DIR"

# ── Dump database ──
BACKUP_FILE="$BACKUP_DIR/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup of $POSTGRES_DB..."

docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl \
    | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup saved: $BACKUP_FILE ($BACKUP_SIZE)"

# ── Cleanup old backups ──
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$KEEP_DAYS -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "[$(date)] Deleted $DELETED old backups (older than $KEEP_DAYS days)"
fi

echo "[$(date)] Backup complete."
