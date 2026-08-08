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

The first deployment automatically creates `/opt/job-application-tracker/.env` with a random URL-safe PostgreSQL password and permissions of `600`. GitHub Actions separately installs `/opt/job-application-tracker/.auth.env` with permissions of `600`. It starts PostgreSQL through Compose, creates the persistent volume, and applies migrations. Later deployments update only `IMAGE_TAG`; they preserve the generated database credentials and named volumes.

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
| `GOOGLE_CLIENT_ID` | Google OAuth web-client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web-client secret |
| `SESSION_SECRET` | At least 32 random characters, such as the output of `openssl rand -hex 32` |

Add environment variables:

| Variable | Value |
| --- | --- |
| `DEPLOY_PORT` | SSH port, normally `22` |
| `PRODUCTION_URL` | HTTPS public origin, for example `https://jobs.example.com` |

Restrict the environment to the `master` branch. Add required approval if deployments should pause for confirmation after images are published.

## 4. Configure DNS, Google, and networking

Create a DNS `A` record for the application domain pointing to the instance's stable public IP. In the Google Cloud Console, create an OAuth web client and add the exact authorized redirect URI:

```text
https://jobs.example.com/api/auth/google/callback
```

Use the same origin as `PRODUCTION_URL`. Google requires an HTTPS domain for a production callback; a raw EC2 IP address cannot be used.

Allow inbound TCP ports 80 and 443 from the internet so Caddy can obtain and renew certificates and serve the application. Allow UDP 443 if HTTP/3 is desired. Allow SSH only from trusted sources when possible. Do not expose backend port 3000 or PostgreSQL port 5432; the production Compose file keeps both internal.

Caddy is included in the production Compose stack and provisions TLS automatically after DNS points to the instance. Authentication uses secure, HTTP-only session cookies and the deployment fails closed when its Google or session secrets are missing.

The local demo username/password endpoint is hard-disabled under `NODE_ENV=production`, and the production Compose stack does not seed the demo account or demo applications.

## 5. Publish a release automatically

Set the next stable semantic version in the root `package.json` without a leading `v`:

```json
{
  "version": "1.0.0"
}
```

Commit the version change with the code intended for that release and push or merge it to `master`. The workflow converts `1.0.0` to the Git tag and GitHub Release `v1.0.0`. Only the root package version controls releases; the package versions under `frontend` and `backend` are ignored. Do not manually create the tag or release first. An existing release tells the workflow that the version is already complete, while an orphaned tag causes it to stop rather than release different code under that tag.

Every push is verified. A new version releases and deploys; an unchanged version stops after verification. Invalid versions such as `v1.0.0`, `1.0`, or `1.0.0-rc.1` fail verification.

The workflow:

1. Installs locked dependencies and runs all current checks.
2. Validates the root package version and checks GitHub for that release.
3. Stops successfully when the version has already been released.
4. Publishes frontend and backend images tagged with the new version and commit SHA.
5. Copies the production Compose file, Caddy configuration, and deployment script to the instance.
6. Writes the protected authentication environment from GitHub environment secrets.
7. Authenticates the instance to GHCR with the workflow's short-lived token.
8. Pulls and starts the exact release version.
9. On the first deployment, generates protected database credentials and starts the PostgreSQL container and volume.
10. Waits for Compose health checks and verifies the proxied API.
11. Restores the previous release version when deployment fails.
12. Creates the version tag and GitHub Release with generated release notes only after deployment succeeds.

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
