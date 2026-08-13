#!/usr/bin/env bash
set -euo pipefail
backup_dir="${1:-./backups}"
mkdir -p "$backup_dir"
backup_file="$backup_dir/jobtracker-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T postgres pg_dump -U jobtracker -d jobtracker -Fc > "$backup_file"
echo "Created PostgreSQL backup: $backup_file"
