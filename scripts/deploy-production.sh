#!/usr/bin/env sh

set -eu

APP_DIR="${APP_DIR:-/opt/job-application-tracker}"
COMPOSE_FILE="${APP_DIR}/compose.production.yml"
ENV_FILE="${APP_DIR}/.env"
NEW_TAG="${1:-}"
NEW_COMMIT_SHA="${2:-unknown}"
SKIP_IMAGE_PULL="${SKIP_IMAGE_PULL:-false}"

if [ -z "$NEW_TAG" ]; then
  echo "Usage: deploy-production.sh <image-tag>" >&2
  exit 2
fi

case "$NEW_TAG" in
  *[!a-zA-Z0-9._-]*)
    echo "Invalid image tag" >&2
    exit 2
    ;;
esac

case "$NEW_COMMIT_SHA" in
  unknown) ;;
  ""|*[!0-9a-fA-F]*) echo "Invalid commit SHA" >&2; exit 2 ;;
esac

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Production Compose file is missing in $APP_DIR" >&2
  exit 2
fi

require_openssl() {
  if ! command -v openssl >/dev/null 2>&1; then
    echo "OpenSSL is required to generate protected runtime credentials." >&2
    exit 2
  fi
}

initialize_environment() {
  require_openssl

  database_password="$(openssl rand -hex 32)"
  session_secret="$(openssl rand -hex 32)"
  grafana_password="$(openssl rand -hex 32)"
  temporary_file="$(mktemp "${ENV_FILE}.XXXXXX")"

  {
    printf '%s\n' "POSTGRES_USER=jobtracker"
    printf '%s\n' "POSTGRES_PASSWORD=$database_password"
    printf '%s\n' "POSTGRES_DB=jobtracker"
    printf '%s\n' "SESSION_SECRET=$session_secret"
    printf '%s\n' "IMAGE_TAG=$NEW_TAG"
    printf '%s\n' "APP_COMMIT_SHA=$NEW_COMMIT_SHA"
    printf '%s\n' "LOG_LEVEL=info"
    printf '%s\n' "PROMETHEUS_RETENTION=15d"
    printf '%s\n' "PROMETHEUS_RETENTION_SIZE=2GB"
    printf '%s\n' "GRAFANA_ADMIN_USER=admin"
    printf '%s\n' "GRAFANA_ADMIN_PASSWORD=$grafana_password"
    printf '%s\n' "GRAFANA_ROOT_URL=http://127.0.0.1:3001"
    printf '%s\n' "GRAFANA_PORT=3001"
  } > "$temporary_file"

  chmod 600 "$temporary_file"
  mv "$temporary_file" "$ENV_FILE"
  echo "Created protected production environment file at $ENV_FILE."
}

if [ ! -e "$ENV_FILE" ]; then
  initialize_environment
elif [ ! -f "$ENV_FILE" ]; then
  echo "Production environment path is not a regular file: $ENV_FILE" >&2
  exit 2
fi

ensure_session_secret() {
  existing_secret="$(sed -n 's/^SESSION_SECRET=//p' "$ENV_FILE" | head -n 1)"
  if [ -n "$existing_secret" ]; then
    return
  fi

  require_openssl
  session_secret="$(openssl rand -hex 32)"
  temporary_file="$(mktemp "${ENV_FILE}.XXXXXX")"
  awk -v secret="$session_secret" '
    BEGIN { replaced = 0 }
    /^SESSION_SECRET=/ {
      if (!replaced) print "SESSION_SECRET=" secret
      replaced = 1
      next
    }
    { print }
    END { if (!replaced) print "SESSION_SECRET=" secret }
  ' "$ENV_FILE" > "$temporary_file"
  chmod --reference="$ENV_FILE" "$temporary_file" 2>/dev/null || chmod 600 "$temporary_file"
  mv "$temporary_file" "$ENV_FILE"
  echo "Added a protected session secret to $ENV_FILE."
}

ensure_session_secret

ensure_grafana_password() {
  existing_password="$(sed -n 's/^GRAFANA_ADMIN_PASSWORD=//p' "$ENV_FILE" | head -n 1)"
  if [ -n "$existing_password" ]; then
    return
  fi

  require_openssl
  grafana_password="$(openssl rand -hex 32)"
  printf '%s\n' "GRAFANA_ADMIN_PASSWORD=$grafana_password" >> "$ENV_FILE"
  echo "Added a protected Grafana administrator password to $ENV_FILE."
}

ensure_grafana_password
chmod 600 "$ENV_FILE"

OLD_TAG="$(sed -n 's/^IMAGE_TAG=//p' "$ENV_FILE" | head -n 1)"
OLD_COMMIT_SHA="$(sed -n 's/^APP_COMMIT_SHA=//p' "$ENV_FILE" | head -n 1)"

set_image_tag() {
  tag="$1"
  temporary_file="$(mktemp "${ENV_FILE}.XXXXXX")"
  awk -v tag="$tag" '
    BEGIN { replaced = 0 }
    /^IMAGE_TAG=/ { print "IMAGE_TAG=" tag; replaced = 1; next }
    { print }
    END { if (!replaced) print "IMAGE_TAG=" tag }
  ' "$ENV_FILE" > "$temporary_file"
  chmod --reference="$ENV_FILE" "$temporary_file" 2>/dev/null || chmod 600 "$temporary_file"
  mv "$temporary_file" "$ENV_FILE"
}

set_commit_sha() {
  sha="$1"
  temporary_file="$(mktemp "${ENV_FILE}.XXXXXX")"
  awk -v sha="$sha" '
    BEGIN { replaced = 0 }
    /^APP_COMMIT_SHA=/ { print "APP_COMMIT_SHA=" sha; replaced = 1; next }
    { print }
    END { if (!replaced) print "APP_COMMIT_SHA=" sha }
  ' "$ENV_FILE" > "$temporary_file"
  chmod --reference="$ENV_FILE" "$temporary_file" 2>/dev/null || chmod 600 "$temporary_file"
  mv "$temporary_file" "$ENV_FILE"
}

rollback() {
  exit_code="$?"
  trap - INT TERM HUP EXIT

  if [ -n "$OLD_TAG" ] && [ "$OLD_TAG" != "$NEW_TAG" ]; then
    echo "Deployment failed; restoring image tag $OLD_TAG" >&2
    set_image_tag "$OLD_TAG"
    set_commit_sha "${OLD_COMMIT_SHA:-unknown}"
    if [ "$SKIP_IMAGE_PULL" != "true" ]; then
      docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull backend frontend
    fi
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans --wait --wait-timeout 180
  fi

  exit "$exit_code"
}

trap rollback INT TERM HUP EXIT

set_image_tag "$NEW_TAG"
set_commit_sha "$NEW_COMMIT_SHA"

if [ "$SKIP_IMAGE_PULL" != "true" ]; then
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull backend frontend
fi
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans --wait --wait-timeout 180

health_response="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T frontend wget -qO- http://127.0.0.1/api/health)"

if [ "$health_response" != '{"status":"ok"}' ]; then
  echo "Unexpected health response: $health_response" >&2
  exit 1
fi

trap - INT TERM HUP EXIT
echo "Deployment of $NEW_TAG completed successfully."
