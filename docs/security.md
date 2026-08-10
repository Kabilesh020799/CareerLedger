# Security and privacy

## Authentication

The API stores sessions in PostgreSQL and sends the browser an HTTP-only cookie named `job-tracker-session`. Production cookies are secure when the public origin uses HTTPS. Passwords are stored as bcrypt hashes. Google OAuth is optional.

The repository includes public demo credentials for demonstration only. Do not store private job-search data behind that shared account.

## Authorization

Application, resume, reminder, dashboard, and Gmail routes require authentication. Services scope owned-resource reads and writes to the authenticated user. A caller must receive a not-found or authorization-safe response instead of learning whether another user's record exists.

## Resume files

- Accept only PDF, DOC, and DOCX files up to 5 MB.
- Validate filename extension, declared MIME type, and file signature.
- Keep S3 Block Public Access enabled.
- Use short-lived presigned upload and download permissions.
- Restrict the EC2 role to the bucket's `resumes/*` prefix.
- Expire abandoned `resumes/pending/` objects through an S3 lifecycle rule.

## Gmail data

OAuth credentials are encrypted at rest. Do not log access tokens, refresh tokens, or full email content. Synchronization stores identifiers and review metadata needed by the feature. Suggested updates never mutate an application until the user confirms them.

## Secrets

Keep `.env`, PEM files, session secrets, database passwords, OAuth secrets, and deployment keys out of Git. Production uses GitHub environment secrets, an EC2 instance role for S3, and GitHub OIDC for temporary AWS deployment access.

## Operational expectations

- Prefer HTTPS for any public login deployment.
- Restrict PostgreSQL and backend ports from the public internet.
- Rotate credentials after exposure and revoke affected sessions.
- Back up PostgreSQL and test restores regularly.
- Review dependency and container-image updates before release.
