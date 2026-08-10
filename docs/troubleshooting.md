# Troubleshooting

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

## Data after restart

Normal `docker compose down` and container recreation preserve the named PostgreSQL volume. Do not use `docker compose down --volumes` unless deleting the database is intentional.
