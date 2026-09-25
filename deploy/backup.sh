#!/bin/sh
# Nightly Postgres backup for the production stack (docs/DEPLOYMENT.md). Writes a compressed
# custom-format dump to deploy/backups/ and keeps the last $KEEP_DAYS days.
#   crontab: 15 3 * * * /srv/greek-bible-teacher/deploy/backup.sh >> /var/log/gbt-backup.log 2>&1
# Copy the dumps off the server too: a backup on the same disk is not a backup.
set -eu

cd "$(dirname "$0")"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p backups
file="backups/greek-$(date -u +%Y%m%dT%H%M%SZ).dump"

# pg_dump runs inside the db container, with the credentials from its own environment.
docker compose -f docker-compose.yml exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$file.partial"
mv "$file.partial" "$file"
echo "[backup] wrote $file ($(du -h "$file" | cut -f1))"

find backups -name 'greek-*.dump' -mtime +"$KEEP_DAYS" -print -delete
