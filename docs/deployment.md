# Automated versioned production deployment

Pull requests targeting `master` run verification only. Every push to `master` is verified and reads the root `package.json` version. If that version has not been released, GitHub Actions creates the GitHub Release, publishes versioned Docker images to GitHub Container Registry, and deploys that exact version to the production instance through SSH. A push that keeps an already released version does not publish or deploy again.

AWS resources are described separately in [`infrastructure/`](../infrastructure/README.md). Terraform owns the EC2 instance, Elastic IP, security-group baseline, private resume bucket, CloudFront distribution and WAF attachment, instance role, and GitHub OIDC deployment role after they are explicitly imported. GitHub Actions continues to own application releases and temporary SSH rules; Docker Compose continues to own containers and volumes. Never apply the production Terraform configuration until the adoption plan contains no replacement or deletion.

For a new isolated environment, run `./scripts/provision-production.sh` from a clean revision already pushed to `master`. It provisions the complete `infrastructure/standalone` stack, updates non-secret GitHub environment variables, builds and starts the first release through SSM, and verifies HTTPS health. It prompts before both saved Terraform plans and never uses `-auto-approve`. Override its defaults with `AWS_REGION`, `TF_STATE_BUCKET`, `RESUME_BUCKET`, `NAME_PREFIX`, `INSTANCE_TYPE`, or `ROOT_VOLUME_SIZE`.

Production releases configured for legacy SSH deployment automatically retry through Systems Manager when the host does not accept the SSH connection. This fallback uses the existing instance and deployment settings and removes its short-lived encrypted parameters after the attempt.

The deployment script stops the existing Compose stack, removes orphaned services, and prunes only unused Docker images before pulling replacements. Volumes are retained. This creates a short maintenance window, but prevents services or images removed by a release from exhausting a small host while the new images are downloaded.

## 1. Prepare the instance

Install Docker Engine with the Compose plugin using the instructions for the instance's Linux distribution. Create a non-root deployment user and grant it permission to run Docker.

Create the application directory:

```bash
sudo mkdir -p /opt/job-application-tracker
sudo chown "$USER":"$USER" /opt/job-application-tracker
chmod 700 /opt/job-application-tracker
```

The first deployment automatically creates `/opt/job-application-tracker/.env` with random URL-safe PostgreSQL and session credentials and permissions of `600`. GitHub Actions separately installs `/opt/job-application-tracker/.auth.env` with the public application URL and secure cookie mode. It starts PostgreSQL, Redis, persistent volumes, migrations, and the separate Gmail worker. Later deployments update `IMAGE_TAG` and `APP_COMMIT_SHA`; they preserve generated credentials and named volumes. Existing deployments missing a session secret receive one automatically on their next deployment.

Attach an EC2 instance role that can perform `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on the private resume bucket's `resumes/*` prefix. Keep all S3 Block Public Access controls enabled. Because the backend runs in Docker and uses IMDSv2 credentials, enable the metadata endpoint, require IMDSv2, and set the metadata response hop limit to `2`. No static AWS access keys are needed.

`deploy/.env.production.example` remains available as a reference or for deliberately supplying credentials before the first deployment. Do not commit or transmit the production environment file.

## 2. Create a deployment SSH key

Generate a dedicated key locally:

```bash
ssh-keygen -t ed25519 -C "job-tracker-deploy" -f job-tracker-deploy
```

Append `job-tracker-deploy.pub` to the deployment user's `~/.ssh/authorized_keys` on the instance. Store the private key contents as the GitHub environment secret `DEPLOY_SSH_KEY`. Do not use a personal SSH key.

Collect the verified host key from a trusted connection:

```bash
ssh-keyscan -H your-instance-hostname
```

Compare the fingerprint with the instance before saving the output as `DEPLOY_KNOWN_HOSTS`. This prevents an unattended deployment from accepting an unexpected SSH host.

## 3. Configure the GitHub production environment

In the repository, open **Settings → Environments** and create `production`.

Add environment secrets:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | Instance hostname or public IP |
| `DEPLOY_USER` | Non-root deployment user |
| `DEPLOY_SSH_KEY` | Dedicated private deployment key |
| `DEPLOY_KNOWN_HOSTS` | Verified SSH known-hosts line |
| `GOOGLE_CLIENT_ID` | Optional Google web OAuth client ID used for Gmail connection |
| `GOOGLE_CLIENT_SECRET` | Optional Google web OAuth client secret used for Gmail connection |
| `OPENAI_API_KEY` | Optional OpenAI API key used only to classify Gmail messages that deterministic rules cannot classify |
| `VAPID_PRIVATE_KEY` | Web Push private key generated with its matching public key |
| `SMTP_USER` | Optional SMTP login username |
| `SMTP_PASSWORD` | Optional SMTP login password |

Add environment variables:

| Variable | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | IAM role trusted by this repository's `production` environment through GitHub OIDC |
| `AWS_REGION` | AWS region containing the instance and security group, currently `us-east-1` |
| `DEPLOY_SECURITY_GROUP_ID` | EC2 security group whose SSH ingress is managed during deployment |
| `DEPLOY_PORT` | SSH port, normally `22` |
| `PRODUCTION_URL` | Public HTTPS origin, currently `https://d2g95c1jos960v.cloudfront.net` |
| `PUBLIC_API_URL` | Public backend origin used to construct calendar subscription links; normally the same public origin |
| `RESUME_BUCKET` | Optional private S3 bucket for resume objects, currently `jatbucket2799`; database storage remains available when omitted |
| `VAPID_PUBLIC_KEY` | Public Web Push application-server key |
| `VAPID_SUBJECT` | Web Push contact URI, such as `mailto:administrator@example.com` |
| `SMTP_HOST` | Optional SMTP server hostname |
| `OPENAI_ALLOWED_ACCOUNT_EMAILS` | Comma-separated application login emails allowed to use OpenAI; empty denies every account |
| `OPENAI_GMAIL_MODEL` | Optional Gmail fallback model; defaults to `gpt-5-mini` |
| `OPENAI_GMAIL_CONFIDENCE_THRESHOLD` | Minimum accepted fallback confidence from 0 to 100; defaults to `80` |
| `OPENAI_GMAIL_TIMEOUT_MS` | Maximum provider request duration in milliseconds; defaults to `10000` |
| `SMTP_PORT` | SMTP port, normally `587` or `465` |
| `SMTP_FROM` | Verified sender address for reminders, password reset, and email verification |

Restrict the environment to the `master` branch. Add required approval if deployments should pause for confirmation after images are published.

Generate a VAPID pair once with `npx web-push generate-vapid-keys` and retain it across deployments so existing browser subscriptions remain valid. Store its private key as a protected secret. SMTP and Web Push are independent and either can be omitted; the production worker reads the same protected notification configuration as the API.

The deployment job uses GitHub OIDC to assume a least-privilege IAM role. That role can only authorize and revoke ingress on the application's security group. At the start of a deployment, the workflow permits SSH from the active GitHub runner's public IPv4 `/32`; its final step removes that rule even when deployment fails. No long-lived AWS access key is stored in GitHub, and port 22 does not need permanent public ingress.

Configure the resume bucket CORS policy to allow `GET`, `HEAD`, and `POST` only from the production CloudFront origin. Add a lifecycle rule that expires objects under `resumes/pending/` after one day. The application promotes verified uploads to `resumes/active/`, so active attachments are not affected. On startup, the backend idempotently moves legacy PostgreSQL-backed resume bytes into S3 and retains the database copy whenever an upload cannot be completed.

To enable Gmail synchronization, enable the Gmail API in the Google Cloud project, configure its OAuth consent screen, and register the exact redirect URI `https://your-domain/api/gmail/callback`. Add test users while the consent screen remains in testing. Gmail metadata is a restricted scope and a public app that stores restricted-scope data may require Google verification and a security assessment.

Google requires HTTPS redirect URIs on a domain the application is authorized to use; only localhost IP callbacks are exempt. The CloudFront address supports the application and password sessions, but Gmail OAuth production verification still requires a domain you control. Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` unset until that domain is available.

## 4. Configure networking

CloudFront distribution `EI1Q2B9SNAQJH` serves browser-facing HTTPS at `d2g95c1jos960v.cloudfront.net` and connects to the EC2 frontend on port 80. Its behavior allows all application methods, disables caching for authenticated responses, and forwards headers, cookies, and query strings. The instance's inbound port 80 rule is restricted to the AWS-managed CloudFront origin-facing prefix list `pl-3b927c52`; direct public HTTP access is disabled. SSH is opened only for the active deployment runner and removed afterward. Do not expose backend port 3000 or PostgreSQL port 5432; the production Compose file keeps both internal.

CloudFront encrypts browser traffic and the application issues a `Secure`, HTTP-only session cookie. The CloudFront-to-EC2 origin connection currently uses HTTP, so transport encryption is not end-to-end. The frontend passes CloudFront's viewer protocol to Express through `X-Forwarded-Proto` so secure cookies are issued correctly.

The application bootstraps these built-in production accounts on every container start:

```text
Username: demo
Password: JobTrackerDemo123!

Username: demo2
Password: JobTrackerDemo456!
```

The passwords are intentionally present in the application source and are therefore public. The bootstrap process stores only their bcrypt hashes in PostgreSQL and updates existing demo-user hashes when necessary. Each account owns separate data. Production does not seed any demo application records. Do not store private information behind these shared accounts.

## 5. Publish a release automatically

Set the next stable semantic version in the root `package.json` without a leading `v`:

```json
{
  "version": "1.0.0"
}
```

Add categorized `Added`, `Changed`, `Fixed`, or `Security` entries under the matching version section in `CHANGELOG.md`. Commit the version and changelog changes with the code intended for that release and push or merge them to `master`. The workflow converts `1.0.0` to the Git tag and GitHub Release `v1.0.0`, using that changelog section as the release description. Only the root package version controls releases; the package versions under `frontend` and `backend` are ignored. Do not manually create the tag or release first. An existing release tells the workflow that the version is already complete, while an orphaned tag causes it to stop rather than release different code under that tag.

Every push is verified. A new version releases and deploys; an unchanged version stops after verification. Invalid versions such as `v1.0.0`, `1.0`, or `1.0.0-rc.1` fail verification.

The workflow:

1. Installs locked dependencies and runs all current checks.
2. Validates the root package version and its categorized `CHANGELOG.md` section, then checks GitHub for that release.
3. Stops successfully when the version has already been released.
4. Publishes frontend and backend images tagged with the new version and commit SHA.
5. Assumes the repository-specific AWS role, temporarily permits SSH from the active runner's `/32`, and copies the production Compose file and deployment script to the instance.
6. Writes the public application origin and HTTP cookie mode to the instance.
7. Authenticates the instance to GHCR with the workflow's short-lived token.
8. Pulls and starts the exact release version.
9. On the first deployment, generates protected database and session credentials, bootstraps the built-in demo users, and starts the PostgreSQL container and volume.
10. Waits for Compose health checks and verifies the proxied API.
11. Restores the previous release version when deployment fails.
12. Creates the version tag and GitHub Release with the matching changelog entries only after deployment succeeds.
13. Removes the runner-specific SSH ingress rule whether deployment succeeds or fails.

Release planning runs alongside verification. Within verification, backend checks, frontend unit/lint/build checks, release metadata, deployment automation, and two isolated Playwright shards run concurrently when GitHub runner capacity is available. Each browser shard receives its own PostgreSQL and Redis services and uses a version-matched Playwright image with Chromium preinstalled. Frontend and backend images also build in parallel with persistent BuildKit caches. Publishing remains gated on every verification job and a new version. The deployment pulls only the two versioned application images; stable infrastructure images are reused unless they are missing. The backend runtime image contains compiled code and production dependencies rather than test and build tooling.

If deployment fails, the version remains unreleased and a later verified push can retry it. Image tags for an unreleased version may be replaced by that retry; after the GitHub Release is created, the version is immutable.

Use semantic versioning:

- Increment `PATCH` for backward-compatible fixes, such as `v1.0.1`.
- Increment `MINOR` for backward-compatible features, such as `v1.1.0`.
- Increment `MAJOR` for incompatible changes, such as `v2.0.0`.

If deployment fails, correct the instance problem and use **Re-run failed jobs**, or push another verified commit with the same unreleased root version. Do not reuse a successfully released version for different source code; publish a new patch version instead.

## Operations

The browser extension is distributed separately from Docker. The checked-in Manifest V3 package permits the local API and current CloudFront origin. If the production origin changes, update `extension/manifest.json` `host_permissions`, reload or redistribute the extension, and configure its popup with the new `/api` URL.

Inspect the running stack:

```bash
cd /opt/job-application-tracker
docker compose --env-file .env -f compose.production.yml ps
docker compose --env-file .env -f compose.production.yml logs --tail=100
```

Deployments remove obsolete containers while preserving the application, PostgreSQL, Redis, and their named volumes.

Manual rollback:

```bash
cd /opt/job-application-tracker
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<previous-version>/' .env
./deploy-production.sh <previous-version>
```

The PostgreSQL and Redis named volumes are not removed during deployments. PostgreSQL is authoritative and must be backed up separately before schema changes and on a regular schedule. Enabled Gmail schedules are reconstructed from PostgreSQL if Redis queue data is lost.
