#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "Usage: bootstrap-instance.sh <application-url> <resume-bucket> <aws-region> <git-ref>" >&2
  exit 2
fi

application_url="${1%/}"
resume_bucket="$2"
aws_region="$3"
git_ref="$4"
source_dir="/opt/job-application-tracker-source"
app_dir="/opt/job-application-tracker"

if [ ! -f /var/lib/job-tracker-bootstrap-ready ]; then
  echo "EC2 cloud-init has not completed." >&2
  exit 1
fi

if [ ! -d "$source_dir/.git" ]; then
  git clone https://github.com/Kabilesh020799/JobApplicationTracker.git "$source_dir"
fi

git -C "$source_dir" fetch --depth=1 origin "$git_ref"
git -C "$source_dir" checkout --detach FETCH_HEAD

image_tag="bootstrap-$(git -C "$source_dir" rev-parse --short=12 HEAD)"
commit_sha="$(git -C "$source_dir" rev-parse HEAD)"
docker build --tag "ghcr.io/kabilesh020799/jobapplicationtracker-backend:$image_tag" "$source_dir/backend"
docker build \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_ENABLE_PASSWORD_LOGIN=true \
  --build-arg VITE_ENABLE_GOOGLE_LOGIN=false \
  --build-arg VITE_INSECURE_HTTP_DEPLOYMENT=false \
  --tag "ghcr.io/kabilesh020799/jobapplicationtracker-frontend:$image_tag" \
  "$source_dir/frontend"

install -d -m 700 "$app_dir"
install -m 600 "$source_dir/deploy/compose.production.yml" "$app_dir/compose.production.yml"
install -m 700 "$source_dir/scripts/deploy-production.sh" "$app_dir/deploy-production.sh"

umask 077
cat > "$app_dir/.auth.env" <<EOF
FRONTEND_URL=$application_url
COOKIE_SECURE=true
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=
OPENAI_GMAIL_MODEL=gpt-5-mini
OPENAI_GMAIL_CONFIDENCE_THRESHOLD=80
OPENAI_GMAIL_TIMEOUT_MS=10000
GMAIL_CALLBACK_URL=$application_url/api/gmail/callback
AWS_REGION=$aws_region
RESUME_BUCKET=$resume_bucket
RESUME_UPLOAD_EXPIRES_SECONDS=300
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
EOF

APP_DIR="$app_dir" SKIP_IMAGE_PULL=true "$app_dir/deploy-production.sh" "$image_tag" "$commit_sha"
