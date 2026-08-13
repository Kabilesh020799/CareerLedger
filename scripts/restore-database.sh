#!/usr/bin/env bash
set -euo pipefail
backup_file="${1:-}"
if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
  echo "Usage: $0 /path/to/jobtracker.dump" >&2
  exit 2
fi
if [[ "${CONFIRM_RESTORE:-}" != "jobtracker" ]]; then
  echo "Restore replaces current application data. Re-run with CONFIRM_RESTORE=jobtracker." >&2
  exit 2
fi
docker compose exec -T postgres pg_restore -U jobtracker -d jobtracker --clean --if-exists --no-owner < "$backup_file"
echo "Restored PostgreSQL from: $backup_file"
