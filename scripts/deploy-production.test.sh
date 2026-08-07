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
grep -q '^IMAGE_TAG=new-tag$' "$TEST_DIRECTORY/app/.env"
grep -q 'pull' "$FAKE_DOCKER_LOG"
grep -q 'up -d --remove-orphans --wait --wait-timeout 180' "$FAKE_DOCKER_LOG"

: > "$TEST_DIRECTORY/docker.log"

if APP_DIR="$TEST_DIRECTORY/app" FAKE_HEALTH=bad sh "$REPOSITORY_ROOT/scripts/deploy-production.sh" broken-tag; then
  echo "Expected an unhealthy deployment to fail" >&2
  exit 1
fi

grep -q '^IMAGE_TAG=new-tag$' "$TEST_DIRECTORY/app/.env"

echo "Deployment script tests passed."
