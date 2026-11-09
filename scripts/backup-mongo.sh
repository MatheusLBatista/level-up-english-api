#!/bin/sh
set -eu

DB_CONTAINER="${DB_CONTAINER:-level-up-english-db}"
API_CONTAINER="${API_CONTAINER:-level-up-english-api}"
DB_NAME="${DB_NAME:-level-up-english}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"

umask 077
mkdir -p "$BACKUP_DIR"
stamp=$(date +%Y-%m-%d-%H%M)
db_file="$BACKUP_DIR/levelup-db-$stamp.archive.gz"
uploads_file="$BACKUP_DIR/levelup-uploads-$stamp.tar.gz"

docker exec "$DB_CONTAINER" mongodump --db "$DB_NAME" --archive --gzip > "$db_file.tmp"
docker exec "$API_CONTAINER" tar -czf - -C /node-app uploads > "$uploads_file.tmp"

test -s "$db_file.tmp"
test -s "$uploads_file.tmp"
gzip -t "$db_file.tmp"
gzip -t "$uploads_file.tmp"

mv "$db_file.tmp" "$db_file"
mv "$uploads_file.tmp" "$uploads_file"

find "$BACKUP_DIR" -name 'levelup-*' -mtime +"$KEEP_DAYS" -delete

echo "Backup concluido: $db_file e $uploads_file"
