# Automated versioned production deployment

Pull requests targeting `master` run verification only. Every push to `master` is verified and reads the root `package.json` version. If that version has not been released, GitHub Actions creates the GitHub Release, publishes versioned Docker images to GitHub Container Registry, and deploys that exact version to the production instance through SSH. A push that keeps an already released version does not publish or deploy again.

## 1. Prepare the instance

Install Docker Engine with the Compose plugin using the instructions for the instance's Linux distribution. Create a non-root deployment user and grant it permission to run Docker.

Create the application directory:

```bash
sudo mkdir -p /opt/job-application-tracker
sudo chown "$USER":"$USER" /opt/job-application-tracker
chmod 700 /opt/job-application-tracker
```

The first deployment automatically creates `/opt/job-application-tracker/.env` with random URL-safe PostgreSQL and session credentials and permissions of `600`. GitHub Actions separately installs `/opt/job-application-tracker/.auth.env` with the public application URL and HTTP cookie mode. It starts PostgreSQL through Compose, creates the persistent volume, and applies migrations. Later deployments update only `IMAGE_TAG`; they preserve the generated credentials and named volumes. Existing deployments that do not yet have `SESSION_SECRET` receive one automatically on their next deployment.

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

Add environment variables:

| Variable | Value |
| --- | --- |
| `DEPLOY_PORT` | SSH port, normally `22` |
| `PRODUCTION_URL` | Public HTTP or HTTPS origin, currently `http://54.204.226.12` |

Restrict the environment to the `master` branch. Add required approval if deployments should pause for confirmation after images are published.

To enable Gmail synchronization, enable the Gmail API in the Google Cloud project, configure its OAuth consent screen, and register the exact redirect URI `https://your-domain/api/gmail/callback`. Add test users while the consent screen remains in testing. Gmail metadata is a restricted scope and a public app that stores restricted-scope data may require Google verification and a security assessment.

Google requires HTTPS redirect URIs on a public domain; only localhost HTTP callbacks are exempt. The current raw-IP HTTP demo deployment therefore cannot enable Gmail authorization. Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` unset there, or move production to an HTTPS domain before configuring them.

## 4. Configure networking

Allow inbound TCP port 80 from the internet. Allow SSH only from trusted sources when possible. Do not expose backend port 3000 or PostgreSQL port 5432; the production Compose file keeps both internal.

The selected deployment intentionally uses plain HTTP with username/password authentication. This does not encrypt the login password or session cookie in transit. A network observer may capture and reuse them. The login page displays this warning, and the session cookie is intentionally configured without the `Secure` attribute so it can operate over HTTP.

The application bootstraps this built-in production account on every container start:

```text
Username: demo
Password: JobTrackerDemo123!
```

The password is intentionally present in the application source and is therefore public. The bootstrap process stores only its bcrypt hash in PostgreSQL and updates the existing demo user's hash when necessary. Production does not seed any demo application records. Do not store private information behind this shared account.

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
5. Copies the production Compose file and deployment script to the instance.
6. Writes the public application origin and HTTP cookie mode to the instance.
7. Authenticates the instance to GHCR with the workflow's short-lived token.
8. Pulls and starts the exact release version.
9. On the first deployment, generates protected database and session credentials, bootstraps the built-in demo user, and starts the PostgreSQL container and volume.
10. Waits for Compose health checks and verifies the proxied API.
11. Restores the previous release version when deployment fails.
12. Creates the version tag and GitHub Release with the matching changelog entries only after deployment succeeds.

Release planning runs in parallel with verification. Frontend and backend images build in parallel with persistent BuildKit caches, and publishing remains gated on both successful verification and a new version. The deployment pulls only the two versioned application images; stable infrastructure images are reused unless they are missing. The backend runtime image contains compiled code and production dependencies rather than test and build tooling.

If deployment fails, the version remains unreleased and a later verified push can retry it. Image tags for an unreleased version may be replaced by that retry; after the GitHub Release is created, the version is immutable.

Use semantic versioning:

- Increment `PATCH` for backward-compatible fixes, such as `v1.0.1`.
- Increment `MINOR` for backward-compatible features, such as `v1.1.0`.
- Increment `MAJOR` for incompatible changes, such as `v2.0.0`.

If deployment fails, correct the instance problem and use **Re-run failed jobs**, or push another verified commit with the same unreleased root version. Do not reuse a successfully released version for different source code; publish a new patch version instead.

## Operations

Inspect the running stack:

```bash
cd /opt/job-application-tracker
docker compose --env-file .env -f compose.production.yml ps
docker compose --env-file .env -f compose.production.yml logs --tail=100
```

Manual rollback:

```bash
cd /opt/job-application-tracker
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<previous-version>/' .env
./deploy-production.sh <previous-version>
```

The PostgreSQL named volume is not removed during deployments. Back it up separately before schema changes and on a regular schedule.
