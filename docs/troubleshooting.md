# Troubleshooting

If password-reset mail does not arrive, confirm the SMTP settings and verified sender. The public acknowledgement remains intentionally identical for unknown accounts and delivery failures.

If a shared workspace appears empty, select it again and confirm requests include `X-Workspace-Id`. If a calendar subscription points to localhost, set `PUBLIC_API_URL` to the public backend origin and rotate the link; rotated or revoked URLs intentionally return not found.

## Terraform refuses to initialize or plan

Use Terraform 1.10 or newer because production state uses native S3 lockfiles. Bootstrap the state bucket first, copy `infrastructure/production/backend.hcl.example` to the ignored `backend.hcl`, and run `terraform init -backend-config=backend.hcl`. An `InvalidClientTokenId` error means the active AWS credentials are expired or inconsistent; refresh the operator session before planning. Never bypass the remote backend or apply an adoption plan that proposes production replacement or deletion.

## One-command provisioning cannot reach the instance

Confirm the instance appears as `Online` in Systems Manager and that cloud-init completed. The standalone instance has no SSH ingress by design. Inspect `/var/log/cloud-init-output.log` through an SSM session when necessary. If the first build fails on a small instance, retry with `INSTANCE_TYPE=t3.medium`; the generated database credentials and Docker volumes remain on the encrypted EBS volume.

## Docker daemon permission denied

If `docker info` cannot access `/var/run/docker.sock`, add the deployment user to the Docker group, log out and back in, and verify `docker info` succeeds without `sudo`.

## `docker --env-file` is unknown

`--env-file` belongs to Docker Compose, not the root Docker command. Install the Compose plugin and use `docker compose --env-file .env -f compose.production.yml up -d`.

## Deployment SSH timeout

Confirm the instance is running, `DEPLOY_HOST` uses its current Elastic IP or stable hostname, port 22 is reachable, and the workflow's OIDC role can temporarily update the intended security group.

## Host key verification failed

Generate `DEPLOY_KNOWN_HOSTS` with `ssh-keyscan -H <host>` from a trusted network and compare its fingerprint with the instance before storing it in the GitHub production environment.

## Prisma client module missing

Run `npm run db:generate` in `backend`. Docker and CI builds run generation before TypeScript compilation; do not edit generated client files.

## Swagger page does not load

Confirm the backend is running and `GET /api/health` succeeds. Swagger redirects `/api-docs` to `/api-docs/`. Rebuild the backend container after changing OpenAPI or route JSDoc: `docker compose up -d --build backend`.

## CloudFront returns 403 for API requests

The API behavior must allow `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`, disable caching, and forward cookies, headers, and query strings. Confirm the origin points to the frontend proxy and its security group permits the CloudFront origin-facing prefix list.

## Browser reports mixed content

An HTTPS frontend cannot call an HTTP API. Use the same HTTPS origin with `/api` proxied to the backend, or provide an HTTPS API origin.

## S3 upload CORS failure

Set CORS on the S3 bucket, not the IAM role. Allow the exact application origin and `POST`, `GET`, and `HEAD`. Keep the bucket private; a 403 from the bucket root is expected.

## Google `redirect_uri_mismatch`

The Google OAuth client's authorized redirect URI must exactly match the application callback, including scheme, hostname, port, and path. Public callbacks require HTTPS and normally a domain controlled by the developer. Add test users while the consent screen remains in testing.

## Automatic Gmail synchronization does not run

Check `docker compose ps redis gmail-worker backend`. Verify `REDIS_URL` uses the Compose service hostname (`redis://redis:6379`), inspect worker logs with `docker compose logs gmail-worker`, and confirm Gmail is still connected. The API recreates enabled schedules after restart; a warning on the Gmail page means the worker will retry temporary failures with exponential backoff.

If an improved classifier should recover an older unmatched email, deploy the updated backend and choose **Sync now**. Stored message references are re-evaluated once with the new classifier version in batches of up to 100; repeat synchronization if the account has more than 100 older references.

## Ambiguous Gmail messages are not suggested

Deterministic classification always runs first. The optional LLM fallback runs only when those rules return no result. Confirm `OPENAI_API_KEY` is available to both `backend` and `gmail-worker`, and that the signed-in application's login email appears in the comma-separated `OPENAI_ALLOWED_ACCOUNT_EMAILS` value. Matching is case-insensitive; an empty allowlist denies everyone. Optionally verify `OPENAI_GMAIL_MODEL`, `OPENAI_GMAIL_CONFIDENCE_THRESHOLD`, and `OPENAI_GMAIL_TIMEOUT_MS`. Restart both services after changing their environment.

An absent key, timeout, provider error, non-success response, malformed structured response, or result below the confidence threshold intentionally leaves the message unmatched and does not fail synchronization. Never print the API key or email content while investigating. After correcting configuration, choose **Sync now** to re-evaluate eligible stored messages.

## The user-account dashboard is missing

By default, sign in as the first built-in demo account (`demo`, using its documented demo password). To use another administrator, confirm that account's login email appears in the comma-separated `ADMIN_ACCOUNT_EMAILS` production environment variable. Matching is case-insensitive and a configured list replaces the demo default. Sign out and back in, or refresh the page, after changing the setting so the session endpoint refreshes the navigation flag. A direct API request from a non-admin correctly returns `403`.

## Password login is temporarily limited

A `429` response means the account or network address exceeded its temporary login allowance. Respect the response's `Retry-After` seconds instead of repeatedly retrying. If valid logins are never delayed or logs contain `auth.login.protection_unavailable`, confirm Redis is healthy and `REDIS_URL` is reachable from the backend. Do not print raw usernames, passwords, or Redis connection strings while investigating.

## Data after restart

Normal `docker compose down` and container recreation preserve the named PostgreSQL volume. Do not use `docker compose down --volumes` unless deleting the database is intentional.

## Extension cannot read a posting

Use a normal HTTP or HTTPS tab rather than browser-internal pages. Reload the tab after installing or updating the unpacked extension. Some publishers omit structured `JobPosting` metadata, so review and complete the proposed fields manually.

## Extension capture returns 401

Create a new token from the application's Extension page and save it in the popup. The previous token may be expired, revoked, mistyped, or associated with a deleted account. Never place the token in page source or browser console output.

## Extension cannot reach a different deployment

Manifest V3 requires API origins in `host_permissions`. Add the deployment's exact origin to `extension/manifest.json`, reload the unpacked extension, and configure the matching `/api` URL in its popup.

## Notification channel is unavailable

Email requires both `SMTP_HOST` and `SMTP_FROM`; authenticated providers also require `SMTP_USER` and `SMTP_PASSWORD`. Browser push requires a matching `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Restart the API and worker after changing environment values.

Browser push requires HTTPS except on localhost. If permission was denied, restore notification permission in the browser's site settings and enable the channel again. Changing VAPID keys invalidates existing subscriptions, so disable and re-enable browser push after a key rotation.
