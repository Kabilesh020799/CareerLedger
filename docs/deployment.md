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

The first deployment automatically creates `/opt/job-application-tracker/.env` with a random URL-safe PostgreSQL password and permissions of `600`. It starts PostgreSQL through Compose, creates the persistent volume, applies migrations, and seeds the initial data. Later deployments update only `IMAGE_TAG`; they preserve the generated credentials and named volume.

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

Add environment variables:

| Variable | Value |
| --- | --- |
| `DEPLOY_PORT` | SSH port, normally `22` |
| `PRODUCTION_URL` | Public application URL |

Restrict the environment to the `master` branch. Add required approval if deployments should pause for confirmation after images are published.

## 4. Prepare networking

Allow inbound SSH only from trusted sources when possible. Expose port 80 for the application. Do not expose backend port 3000 or PostgreSQL port 5432; the production Compose file keeps both internal.

The initial deployment is HTTP. Add a domain and TLS reverse proxy before handling private information over the internet.

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
5. Copies the production Compose file and deployment script to the instance.
6. Authenticates the instance to GHCR with the workflow's short-lived token.
7. Pulls and starts the exact release version.
8. On the first deployment, generates protected database credentials and starts the PostgreSQL container and volume.
9. Waits for Compose health checks and verifies the proxied API.
10. Restores the previous release version when deployment fails.
11. Creates the version tag and GitHub Release with generated release notes only after deployment succeeds.

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
