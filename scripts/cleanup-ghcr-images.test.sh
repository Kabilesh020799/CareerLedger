#!/usr/bin/env sh

set -eu

REPOSITORY_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
TEST_DIRECTORY="$(mktemp -d)"

cleanup() {
  rm -rf "$TEST_DIRECTORY"
}

trap cleanup EXIT

mkdir -p "$TEST_DIRECTORY/bin"

cat > "$TEST_DIRECTORY/bin/gh" <<'SCRIPT'
#!/usr/bin/env sh
printf '%s\n' "$*" >> "$FAKE_GH_LOG"

case "$*" in
  *jobapplicationtracker-backend/versions?per_page=100*)
    if [ "${FAKE_GH_MODE:-}" = "missing-current" ]; then
      printf '%s\n' '[[{"id":100,"metadata":{"container":{"tags":["v3.30.0","previous-sha"]}}}]]'
    else
      printf '%s\n' '[[{"id":101,"metadata":{"container":{"tags":["v3.30.1","current-sha","latest"]}}},{"id":100,"metadata":{"container":{"tags":["v3.30.0","previous-sha"]}}},{"id":99,"metadata":{"container":{"tags":["v3.29.6"]}}},{"id":98,"metadata":{"container":{"tags":[]}}}]]'
    fi
    ;;
  *jobapplicationtracker-frontend/versions?per_page=100*)
    if [ "${FAKE_GH_MODE:-}" = "missing-current" ]; then
      printf '%s\n' '[[{"id":200,"metadata":{"container":{"tags":["v3.30.0","previous-sha"]}}}]]'
    else
      printf '%s\n' '[[{"id":201,"metadata":{"container":{"tags":["v3.30.1","current-sha","latest"]}}},{"id":200,"metadata":{"container":{"tags":["v3.30.0","previous-sha"]}}},{"id":199,"metadata":{"container":{"tags":["v3.29.6"]}}}]]'
    fi
    ;;
esac
SCRIPT
chmod 700 "$TEST_DIRECTORY/bin/gh"

export PATH="$TEST_DIRECTORY/bin:$PATH"
export FAKE_GH_LOG="$TEST_DIRECTORY/gh.log"

RELEASE_TAG=v3.30.1 \
PREVIOUS_RELEASE_TAG=v3.30.0 \
GHCR_OWNER=example \
GHCR_PACKAGES="jobapplicationtracker-backend jobapplicationtracker-frontend" \
sh "$REPOSITORY_ROOT/scripts/cleanup-ghcr-images.sh"

grep -q 'DELETE /users/example/packages/container/jobapplicationtracker-backend/versions/99' "$FAKE_GH_LOG"
grep -q 'DELETE /users/example/packages/container/jobapplicationtracker-backend/versions/98' "$FAKE_GH_LOG"
grep -q 'DELETE /users/example/packages/container/jobapplicationtracker-frontend/versions/199' "$FAKE_GH_LOG"

if grep -Eq 'DELETE /users/example/packages/container/.*/versions/(100|101|200|201)' "$FAKE_GH_LOG"; then
  echo "The current or previous GHCR release was deleted." >&2
  exit 1
fi

: > "$FAKE_GH_LOG"
if FAKE_GH_MODE=missing-current RELEASE_TAG=v3.30.1 PREVIOUS_RELEASE_TAG=v3.30.0 GHCR_OWNER=example \
  GHCR_PACKAGES="jobapplicationtracker-backend jobapplicationtracker-frontend" \
  sh "$REPOSITORY_ROOT/scripts/cleanup-ghcr-images.sh"; then
  echo "Cleanup should fail closed when the current release tag is missing." >&2
  exit 1
fi

if grep -q 'DELETE ' "$FAKE_GH_LOG"; then
  echo "Cleanup deleted a GHCR version after the current release tag was missing." >&2
  exit 1
fi

echo "GHCR cleanup script tests passed."
