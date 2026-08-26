#!/usr/bin/env bash
# ==============================================================================
# HOSTEL EASE — AUTOMATED DATABASE & UPLOADS BACKUP SCRIPT
# ==============================================================================
# Add to crontab for daily automated backups at 2:00 AM:
#   0 2 * * * /var/www/hostel-ease/scripts/backup.sh >> /var/log/hostel-ease-backup.log 2>&1

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${APP_DIR}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_PATH="${APP_DIR}/data/hostel_ease.db"
UPLOADS_DIR="${APP_DIR}/uploads"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting Hostel Ease automated backup..."

# 1. Safe SQLite Online Backup (via SQLite CLI or vacuum into copy)
if [ -f "${DB_PATH}" ]; then
    DB_BACKUP="${BACKUP_DIR}/hostel_ease_${TIMESTAMP}.sqlite"
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "${DB_PATH}" ".backup '${DB_BACKUP}'"
    else
        cp "${DB_PATH}" "${DB_BACKUP}"
    fi
    gzip -f "${DB_BACKUP}"
    echo "[$(date)] Database backup created: ${DB_BACKUP}.gz"
fi

# 2. Backup Uploaded Media
if [ -d "${UPLOADS_DIR}" ] && [ "$(ls -A "${UPLOADS_DIR}" 2>/dev/null)" ]; then
    MEDIA_BACKUP="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
    tar -czf "${MEDIA_BACKUP}" -C "${APP_DIR}" uploads
    echo "[$(date)] Uploads backup created: ${MEDIA_BACKUP}"
fi

# 3. Retention policy: Prune backups older than 30 days
find "${BACKUP_DIR}" -type f -name "*.gz" -mtime +30 -delete
echo "[$(date)] Old backups pruned (30-day retention). Backup finished successfully."
