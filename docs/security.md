# Security and privacy

## Infrastructure state

Production Terraform state belongs in the dedicated private S3 state bucket with encryption, versioning, Block Public Access, and native lockfiles enabled. State, saved plans, and `.tfvars` files are ignored because they can contain infrastructure metadata or sensitive values. Terraform does not manage Gmail OAuth secrets, application credentials, or database contents.

## Authentication

The API stores sessions in PostgreSQL and sends the browser an HTTP-only cookie named `job-tracker-session`. Production cookies are secure when the public origin uses HTTPS. Passwords are stored as bcrypt hashes. Google OAuth is optional.

Password login uses Redis-backed abuse protection before bcrypt authentication. Every attempt is counted atomically against an opaque account reference and network-address reference. Accounts permit eight attempts and network addresses permit thirty attempts per 15-minute expiry window; later attempts receive a progressive delay, and exceeded limits return `429` with `Retry-After`. A successful login clears its account pressure and removes only that successful attempt from the shared network counter, preserving failed-attempt pressure from the same address. Invalid and unknown credentials return the same public response. Security events use session-secret-keyed references and never include usernames, network addresses, passwords, or Redis error contents. Redis failures fail open to preserve account availability and emit a sanitized `auth.login.protection_unavailable` event for operational alerting.

Set `ENABLE_PASSWORD_LOGIN=false` when password authentication is not required. Google configuration does not silently change this setting, preventing an operator from accidentally locking out an existing deployment.

The repository includes public demo credentials for demonstration only. The accounts have separate ownership boundaries, but neither should store private job-search data because their passwords are public.

## Authorization

Application, resume, reminder, dashboard, and Gmail routes require authentication. Services scope owned-resource reads and writes to the authenticated user. A caller must receive a not-found or authorization-safe response instead of learning whether another user's record exists.

## Resume files

- Accept only PDF, DOC, and DOCX files up to 5 MB.
- Validate filename extension, declared MIME type, and file signature.
- Keep S3 Block Public Access enabled.
- Use short-lived presigned upload and download permissions.
- Load in-app previews through the authenticated application API into temporary browser object URLs, and revoke those URLs when the preview closes.
- Restrict the EC2 role to the bucket's `resumes/*` prefix.
- Expire abandoned `resumes/pending/` objects through an S3 lifecycle rule.

## Gmail data

OAuth credentials are encrypted at rest. Do not log access tokens, refresh tokens, or full email content. Synchronization stores identifiers and review metadata needed by the feature. Suggested updates never mutate an application until the user confirms them.

Background jobs contain only the owning user ID. Redis is private to the Compose network and is not published on the host. Worker failures expose a fixed, sanitized status to users and never persist provider error bodies, tokens, or message content.

## Secrets

Keep `.env`, PEM files, session secrets, database passwords, OAuth secrets, and deployment keys out of Git. Production uses GitHub environment secrets, an EC2 instance role for S3, and GitHub OIDC for temporary AWS deployment access.

Greenfield production does not open SSH. GitHub Actions uses OIDC to send an SSM command. Its short-lived GHCR token and generated application environment are stored as encrypted Parameter Store values, read only by the target instance role, and deleted after the deployment attempt.

## Browser extension access

Extension tokens are random, expire after 90 days, are displayed once, and are stored only as SHA-256 hashes. They authorize only creation through the reviewed capture endpoint. Tokens remain in extension-local storage and are never passed to page scripts. Revoke a token immediately if the device or token is lost.

## Notification delivery

Notification preferences and Web Push subscriptions are scoped to the authenticated user. Push endpoints and encryption keys are operational credentials and are never returned through another user's API. VAPID private keys and SMTP passwords belong in local environment files or protected GitHub environment secrets, never source control. Browser push requires HTTPS outside localhost. Notification payloads contain the reminder description, company, role, and application path, so users should avoid sensitive reminder text on shared devices.

## Operational expectations

- Prefer HTTPS for any public login deployment.
- Restrict PostgreSQL and backend ports from the public internet.
- Rotate credentials after exposure and revoke affected sessions.
- Back up PostgreSQL and test restores regularly.
- Review dependency and container-image updates before release.
