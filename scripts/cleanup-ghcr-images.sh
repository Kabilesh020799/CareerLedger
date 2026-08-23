#!/usr/bin/env sh

set -eu

RELEASE_TAG="${RELEASE_TAG:-}"
PREVIOUS_RELEASE_TAG="${PREVIOUS_RELEASE_TAG:-}"
GHCR_OWNER="${GHCR_OWNER:-${GITHUB_REPOSITORY_OWNER:-}}"
GHCR_OWNER_TYPE="${GHCR_OWNER_TYPE:-users}"
GHCR_PACKAGES="${GHCR_PACKAGES:-jobapplicationtracker-backend jobapplicationtracker-frontend}"

if [ -z "$RELEASE_TAG" ]; then
  echo "RELEASE_TAG is required." >&2
  exit 2
fi

if [ -z "$GHCR_OWNER" ]; then
  echo "GHCR_OWNER or GITHUB_REPOSITORY_OWNER is required." >&2
  exit 2
fi

case "$GHCR_OWNER_TYPE" in
  users|orgs) ;;
  *) echo "GHCR_OWNER_TYPE must be users or orgs." >&2; exit 2 ;;
esac

case "$GHCR_OWNER" in
  *[!A-Za-z0-9._-]*) echo "GHCR_OWNER contains invalid characters." >&2; exit 2 ;;
esac

for package_name in $GHCR_PACKAGES; do
  case "$package_name" in
    *[!a-z0-9._-]*)
      echo "GHCR package names must contain only lowercase letters, numbers, dots, underscores, and hyphens." >&2
      exit 2
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required to clean GHCR package versions." >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to inspect GHCR package versions." >&2
  exit 2
fi

package_api_prefix="/$GHCR_OWNER_TYPE/$GHCR_OWNER/packages/container"

cleanup_package() {
  package_name="$1"
  versions="$(gh api --paginate --slurp "$package_api_prefix/$package_name/versions?per_page=100" | jq -c '.[][]')"

  if [ -z "$versions" ]; then
    echo "No GHCR versions were returned for $package_name; refusing cleanup." >&2
    return 1
  fi

  if ! printf '%s\n' "$versions" | jq -s -e \
    --arg current "$RELEASE_TAG" \
    'any(.[]; any(.metadata.container.tags[]?; . == $current))' \
    >/dev/null; then
    echo "Current release tag $RELEASE_TAG was not found for $package_name; refusing cleanup." >&2
    return 1
  fi

  if [ -n "$PREVIOUS_RELEASE_TAG" ] && ! printf '%s\n' "$versions" | jq -s -e \
    --arg previous "$PREVIOUS_RELEASE_TAG" \
    'any(.[]; any(.metadata.container.tags[]?; . == $previous))' \
    >/dev/null; then
    echo "Previous release tag $PREVIOUS_RELEASE_TAG was not found for $package_name; continuing without deleting a matching version." >&2
  fi

  while IFS= read -r version; do
    [ -n "$version" ] || continue

    if printf '%s\n' "$version" | jq -e \
      --arg current "$RELEASE_TAG" \
      --arg previous "$PREVIOUS_RELEASE_TAG" \
      'any(.metadata.container.tags[]?; . == $current or ($previous != "" and . == $previous))' \
      >/dev/null; then
      echo "Retaining $package_name version with $RELEASE_TAG or $PREVIOUS_RELEASE_TAG tag."
      continue
    fi

    version_id="$(printf '%s\n' "$version" | jq -r '.id')"
    case "$version_id" in
      ''|*[!0-9]*)
        echo "GHCR returned an invalid version id for $package_name." >&2
        return 1
        ;;
    esac

    echo "Deleting old GHCR version $package_name/$version_id."
    gh api --method DELETE "$package_api_prefix/$package_name/versions/$version_id" >/dev/null
  done <<EOF
$versions
EOF
}

for package_name in $GHCR_PACKAGES; do
  cleanup_package "$package_name"
done

echo "GHCR cleanup retained release tags $RELEASE_TAG and ${PREVIOUS_RELEASE_TAG:-none}."
