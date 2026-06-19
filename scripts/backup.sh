#!/usr/bin/env bash
# Back up live data + uploads to a timestamped archive. Keeps the latest 14.
# Schedule daily with cron, e.g.:
#   0 3 * * *  DATA_DIR=/srv/perotech/data UPLOAD_DIR=/srv/perotech/uploads bash /path/to/scripts/backup.sh
set -euo pipefail

DATA_DIR="${DATA_DIR:-/srv/perotech/data}"
UPLOAD_DIR="${UPLOAD_DIR:-/srv/perotech/uploads}"
DEST="${BACKUP_DIR:-/srv/perotech/backups}"

mkdir -p "$DEST"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$DEST/perotech-backup-$STAMP.tar.gz"

tar -czf "$ARCHIVE" "$DATA_DIR" "$UPLOAD_DIR"
echo "✅ Backup written to $ARCHIVE"

# Retain only the 14 most recent backups.
ls -1t "$DEST"/perotech-backup-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
