#!/usr/bin/env sh

set -eu

REPOSITORY_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
TEST_DIRECTORY="$(mktemp -d)"

cleanup() {
  rm -rf "$TEST_DIRECTORY"
}

trap cleanup EXIT

mkdir -p "$TEST_DIRECTORY/app" "$TEST_DIRECTORY/bin"
cp "$REPOSITORY_ROOT/deploy/compose.production.yml" "$TEST_DIRECTORY/app/compose.production.yml"

if grep -q 'pull_policy:' "$TEST_DIRECTORY/app/compose.production.yml"; then
  echo "Production Compose must not repeat the deployment script's explicit image pull." >&2
  exit 1
fi
grep -q 'ENABLE_PASSWORD_LOGIN: "true"' "$TEST_DIRECTORY/app/compose.production.yml"
grep -q 'BOOTSTRAP_USER: "true"' "$TEST_DIRECTORY/app/compose.production.yml"
grep -q 'SEED_DEMO_DATA: "false"' "$TEST_DIRECTORY/app/compose.production.yml"

cat > "$TEST_DIRECTORY/bin/docker" <<'SCRIPT'
#!/usr/bin/env sh
printf '%s\n' "$*" >> "$FAKE_DOCKER_LOG"

case "$1 $2" in
  "image inspect")
    case "$5" in
      *jobapplicationtracker-backend:new-tag) printf '%s\n' backend-new-id ;;
      *jobapplicationtracker-backend:old-tag) printf '%s\n' backend-old-id ;;
      *jobapplicationtracker-frontend:new-tag) printf '%s\n' frontend-new-id ;;
      *jobapplicationtracker-frontend:old-tag) printf '%s\n' frontend-old-id ;;
    esac
    ;;
  "image ls")
    printf '%s\n' "${FAKE_DOCKER_IMAGES:-}"
    ;;
  "image rm")
    if [ "${FAKE_DOCKER_RM_FAIL:-false}" = "true" ]; then
      exit 1
    fi
    ;;
esac

case "$*" in
  *"exec -T frontend"*)
    if [ "${FAKE_HEALTH:-ok}" = "ok" ]; then
      printf '%s\n' '{"status":"ok"}'
    else
      printf '%s\n' '{"status":"error"}'
    fi
    ;;
esac
SCRIPT
chmod 700 "$TEST_DIRECTORY/bin/docker"

export PATH="$TEST_DIRECTORY/bin:$PATH"
export FAKE_DOCKER_LOG="$TEST_DIRECTORY/docker.log"

APP_DIR="$TEST_DIRECTORY/app" FAKE_HEALTH=ok sh "$REPOSITORY_ROOT/scripts/deploy-production.sh" first-tag
grep -q '^POSTGRES_USER=jobtracker$' "$TEST_DIRECTORY/app/.env"
grep -Eq '^POSTGRES_PASSWORD=[0-9a-f]{64}$' "$TEST_DIRECTORY/app/.env"
grep -q '^POSTGRES_DB=jobtracker$' "$TEST_DIRECTORY/app/.env"
grep -Eq '^SESSION_SECRET=[0-9a-f]{64}$' "$TEST_DIRECTORY/app/.env"
grep -q '^IMAGE_TAG=first-tag$' "$TEST_DIRECTORY/app/.env"
grep -q '^APP_COMMIT_SHA=unknown$' "$TEST_DIRECTORY/app/.env"

if stat -f '%Lp' "$TEST_DIRECTORY/app/.env" >/dev/null 2>&1; then
  environment_mode="$(stat -f '%Lp' "$TEST_DIRECTORY/app/.env")"
else
  environment_mode="$(stat -c '%a' "$TEST_DIRECTORY/app/.env")"
fi

if [ "$environment_mode" != "600" ]; then
  echo "Expected generated environment file permissions to be 600, got $environment_mode" >&2
  exit 1
fi

cat > "$TEST_DIRECTORY/app/.env" <<'ENV'
POSTGRES_USER=jobtracker
POSTGRES_PASSWORD=test_password
POSTGRES_DB=jobtracker
IMAGE_TAG=old-tag
ENV

export FAKE_DOCKER_IMAGES="ghcr.io/kabilesh020799/jobapplicationtracker-backend|old-tag|backend-old-id
ghcr.io/kabilesh020799/jobapplicationtracker-backend|new-tag|backend-new-id
ghcr.io/kabilesh020799/jobapplicationtracker-backend|stale-tag|backend-stale-id
ghcr.io/kabilesh020799/jobapplicationtracker-frontend|old-tag|frontend-old-id
ghcr.io/kabilesh020799/jobapplicationtracker-frontend|new-tag|frontend-new-id
ghcr.io/kabilesh020799/jobapplicationtracker-frontend|stale-tag|frontend-stale-id"

APP_DIR="$TEST_DIRECTORY/app" FAKE_HEALTH=ok sh "$REPOSITORY_ROOT/scripts/deploy-production.sh" new-tag abc123
grep -q '^POSTGRES_PASSWORD=test_password$' "$TEST_DIRECTORY/app/.env"
grep -Eq '^SESSION_SECRET=[0-9a-f]{64}$' "$TEST_DIRECTORY/app/.env"
grep -q '^IMAGE_TAG=new-tag$' "$TEST_DIRECTORY/app/.env"
grep -q '^APP_COMMIT_SHA=abc123$' "$TEST_DIRECTORY/app/.env"

if stat -f '%Lp' "$TEST_DIRECTORY/app/.env" >/dev/null 2>&1; then
  migrated_environment_mode="$(stat -f '%Lp' "$TEST_DIRECTORY/app/.env")"
else
  migrated_environment_mode="$(stat -c '%a' "$TEST_DIRECTORY/app/.env")"
fi

if [ "$migrated_environment_mode" != "600" ]; then
  echo "Expected migrated environment file permissions to be 600, got $migrated_environment_mode" >&2
  exit 1
fi

session_secret="$(sed -n 's/^SESSION_SECRET=//p' "$TEST_DIRECTORY/app/.env")"
grep -q 'down --remove-orphans' "$FAKE_DOCKER_LOG"
grep -q 'image prune --force' "$FAKE_DOCKER_LOG"
grep -q 'pull backend frontend' "$FAKE_DOCKER_LOG"
grep -q 'up -d --remove-orphans --wait --wait-timeout 180' "$FAKE_DOCKER_LOG"
grep -q 'image rm ghcr.io/kabilesh020799/jobapplicationtracker-backend:stale-tag' "$FAKE_DOCKER_LOG"
grep -q 'image rm ghcr.io/kabilesh020799/jobapplicationtracker-frontend:stale-tag' "$FAKE_DOCKER_LOG"

if grep -Eq 'image rm ghcr.io/kabilesh020799/jobapplicationtracker-.*:(new-tag|old-tag)' "$FAKE_DOCKER_LOG"; then
  echo "The current or previous release image was removed." >&2
  exit 1
fi

first_down_line="$(grep -n -m 1 'down --remove-orphans' "$FAKE_DOCKER_LOG" | cut -d: -f1)"
first_prune_line="$(grep -n -m 1 'image prune --force' "$FAKE_DOCKER_LOG" | cut -d: -f1)"
first_pull_line="$(grep -n -m 1 'pull backend frontend' "$FAKE_DOCKER_LOG" | cut -d: -f1)"
if [ "$first_down_line" -ge "$first_pull_line" ] || [ "$first_pull_line" -ge "$first_prune_line" ]; then
  echo "Expected replacement images to be pulled before post-health cleanup." >&2
  exit 1
fi

first_health_line="$(grep -n -m 1 'exec -T frontend' "$FAKE_DOCKER_LOG" | cut -d: -f1)"
first_stale_removal_line="$(grep -n -m 1 'image rm ghcr.io/kabilesh020799/jobapplicationtracker-backend:stale-tag' "$FAKE_DOCKER_LOG" | cut -d: -f1)"
if [ "$first_health_line" -ge "$first_stale_removal_line" ]; then
  echo "Expected image cleanup to happen after the health check." >&2
  exit 1
fi

: > "$TEST_DIRECTORY/docker.log"
export FAKE_DOCKER_IMAGES=""
APP_DIR="$TEST_DIRECTORY/app" FAKE_HEALTH=ok sh "$REPOSITORY_ROOT/scripts/deploy-production.sh" new-tag abc123
grep -q "^SESSION_SECRET=$session_secret$" "$TEST_DIRECTORY/app/.env"

: > "$TEST_DIRECTORY/docker.log"

if APP_DIR="$TEST_DIRECTORY/app" FAKE_HEALTH=bad sh "$REPOSITORY_ROOT/scripts/deploy-production.sh" broken-tag; then
  echo "Expected an unhealthy deployment to fail" >&2
  exit 1
fi

grep -q '^IMAGE_TAG=new-tag$' "$TEST_DIRECTORY/app/.env"
grep -q '^APP_COMMIT_SHA=abc123$' "$TEST_DIRECTORY/app/.env"

export FAKE_HEALTH=ok
export FAKE_DOCKER_RM_FAIL=true
export FAKE_DOCKER_IMAGES="ghcr.io/kabilesh020799/jobapplicationtracker-backend|stale-tag|backend-stale-id"
if APP_DIR="$TEST_DIRECTORY/app" sh "$REPOSITORY_ROOT/scripts/deploy-production.sh" cleanup-failure-tag; then
  echo "Expected local image cleanup failure to block release publication." >&2
  exit 1
fi
grep -q '^IMAGE_TAG=cleanup-failure-tag$' "$TEST_DIRECTORY/app/.env"

echo "Deployment script tests passed."
