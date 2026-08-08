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

APP_DIR="$TEST_DIRECTORY/app" FAKE_HEALTH=ok sh "$REPOSITORY_ROOT/scripts/deploy-production.sh" new-tag
grep -q '^POSTGRES_PASSWORD=test_password$' "$TEST_DIRECTORY/app/.env"
grep -Eq '^SESSION_SECRET=[0-9a-f]{64}$' "$TEST_DIRECTORY/app/.env"
grep -q '^IMAGE_TAG=new-tag$' "$TEST_DIRECTORY/app/.env"

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
APP_DIR="$TEST_DIRECTORY/app" FAKE_HEALTH=ok sh "$REPOSITORY_ROOT/scripts/deploy-production.sh" new-tag
grep -q "^SESSION_SECRET=$session_secret$" "$TEST_DIRECTORY/app/.env"
grep -q 'pull backend frontend' "$FAKE_DOCKER_LOG"
grep -q 'up -d --remove-orphans --wait --wait-timeout 180' "$FAKE_DOCKER_LOG"

: > "$TEST_DIRECTORY/docker.log"

if APP_DIR="$TEST_DIRECTORY/app" FAKE_HEALTH=bad sh "$REPOSITORY_ROOT/scripts/deploy-production.sh" broken-tag; then
  echo "Expected an unhealthy deployment to fail" >&2
  exit 1
fi

grep -q '^IMAGE_TAG=new-tag$' "$TEST_DIRECTORY/app/.env"

echo "Deployment script tests passed."
