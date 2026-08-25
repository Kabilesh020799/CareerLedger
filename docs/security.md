# Security and privacy

Performance timing headers expose only aggregate millisecond durations and application-list query counts. They never include SQL, bind parameters, request bodies, identifiers, or stored history, and do not reintroduce a logging subsystem.

## Infrastructure state

Production Terraform state belongs in the dedicated private S3 state bucket with encryption, versioning, Block Public Access, and native lockfiles enabled. State, saved plans, and `.tfvars` files are ignored because they can contain infrastructure metadata or sensitive values. Terraform does not manage Gmail OAuth secrets, application credentials, or database contents.

## Authentication

The API stores sessions in PostgreSQL and sends the browser an HTTP-only cookie named `job-tracker-session`. Production cookies are secure when the public origin uses HTTPS. Signup requires a unique normalized username and email plus a 12–72 character password containing uppercase and lowercase letters and a number. Passwords are stored only as bcrypt hashes and are never returned. Google OAuth is optional.

Password login uses Redis-backed abuse protection before bcrypt authentication. Every attempt is counted atomically against an opaque account reference and network-address reference. Accounts permit eight attempts and network addresses permit thirty attempts per 15-minute expiry window; later attempts receive a progressive delay, and exceeded limits return `429` with `Retry-After`. A successful login clears its account pressure and removes only that successful attempt from the shared network counter, preserving failed-attempt pressure from the same address. Invalid and unknown credentials return the same public response. Security events use session-secret-keyed references and never include usernames, network addresses, passwords, or Redis error contents. Redis failures fail closed: login and signup return a generic `503` with `Retry-After` before bcrypt or account-creation work, and emit a sanitized `auth.*.protection_unavailable` event for operational alerting.

Signup uses separate Redis counters so account creation cannot consume login allowances. It permits five attempts per normalized username and ten attempts per network address in 15 minutes, retains successful signup pressure to limit bulk account creation, and emits only opaque `auth.signup.*` security events.

Password reset and verification-resend requests share a separate 15-minute Redis budget: three requests per opaque normalized email and ten per opaque network address. Malformed requests count toward the budget, while allowed requests retain the same generic `202` acknowledgement for known and unknown accounts. Exceeded limits return `429` with `Retry-After`; Redis failures fail closed with the same generic `503` used for login and signup, so an outage cannot be used to send unbounded recovery email.

Set `ENABLE_PASSWORD_LOGIN=false` when password authentication is not required. Google configuration does not silently change this setting, preventing an operator from accidentally locking out an existing deployment.

The repository contains no demo passwords. Optional demo identities are loaded from runtime environment configuration, and production passwords belong in protected GitHub environment secrets. A migration invalidates the passwords previously published for legacy demo usernames; operators must provide replacement secrets to keep those logins available. The accounts retain separate ownership boundaries and should still contain demonstration data only.

## Authorization

Application, sprint, resume, cover-letter, reminder, dashboard, and Gmail routes require authentication. Services scope owned-resource reads and writes to the authenticated user or selected workspace. Sprint history, current-sprint applications, and sprint transitions use the same membership and write-role checks as workspace application access. A caller must receive a not-found or authorization-safe response instead of learning whether another user's record exists.

The account-administration route additionally requires the normalized signed-in email to appear in the server-side administrator allowlist. Empty `ADMIN_ACCOUNT_EMAILS` configuration grants access to the first environment-configured demo account; when no demo identity exists, it grants nobody access. A configured list replaces the demo default, users cannot promote themselves, and administrator-reserved emails cannot create accounts through password signup or Google account creation. Reserved-email rejection uses the normal duplicate-account response so it does not disclose administrator configuration. The frontend's `isAdmin` flag is display-only; the backend independently returns `403` for every non-admin request. Account summaries exclude password hashes, OAuth identifiers, session records, tokens, and private user content.

## Application document files

- Accept only PDF, DOC, and DOCX files up to 5 MB.
- Validate filename extension, declared MIME type, and file signature.
- Keep S3 Block Public Access enabled.
- Use short-lived presigned upload and download permissions.
- Load in-app previews through the authenticated application API into temporary browser object URLs, and revoke those URLs when the preview closes.
- Restrict the EC2 role to the bucket's `resumes/*` prefix; cover letters remain within `resumes/cover-letters/*`.
- Expire abandoned `resumes/pending/` and `resumes/cover-letters/pending/` objects through S3 lifecycle rules.

## External job URLs

- Accept only HTTP and HTTPS job URLs during application writes, portable imports, and browser-extension captures.
- Re-check stored values before rendering job-posting links, so legacy unsafe values remain non-clickable instead of becoming script or data links.

## Gmail data

OAuth credentials are encrypted at rest. Do not log access tokens, refresh tokens, or full email content. Synchronization stores identifiers and review metadata needed by the feature. Suggested updates never mutate an application until the user confirms them.

Deterministic rules classify known recruitment messages before any LLM request. The optional OpenAI fallback receives only bounded subject, sender, and snippet metadata for ambiguous messages, in batches of at most 20 with up to four requests in flight. It disables response storage with `store: false`, caps output, and validates result count, unique indexes, status, and confidence before creating pending suggestions. A malformed batch fails closed without trusting partial raw output, and raw model output can never mutate an application. Keep `OPENAI_API_KEY` in local environment files or protected deployment secrets; never log or commit it. Access is restricted by the normalized application login emails in `OPENAI_ALLOWED_ACCOUNT_EMAILS`; an absent or empty allowlist denies all accounts even when a key exists. Provider errors and unauthorized accounts fail closed for that suggestion while Gmail synchronization continues.

Manual Gmail synchronization jobs are user scoped. Status lookup verifies the queued job's owner and manual trigger before returning progress; missing and cross-user identifiers receive the same not-found response. Public failure states are fixed messages and do not reveal provider output, Redis details, email content, or credentials.

When a Gmail review creates an application, any selected résumé tag must belong to the signed-in user. Optional résumé attachments pass through the same type, signature, size, ownership, and private-storage checks as standard application uploads; a failed validation does not resolve the review.

Background jobs contain only the owning user ID. Redis is private to the Compose network and is not published on the host. Worker failures expose a fixed, sanitized status to users and never persist provider error bodies, tokens, or message content.

## Secrets

Keep `.env`, PEM files, session secrets, database passwords, OAuth secrets, and deployment keys out of Git. Production uses GitHub environment secrets, an EC2 instance role for S3, and GitHub OIDC for temporary AWS deployment access.

Greenfield production does not open SSH. GitHub Actions uses OIDC to send an SSM command. Its short-lived GHCR token and generated application environment are stored as encrypted Parameter Store values, read only by the target instance role, and deleted after the deployment attempt.

## Browser extension access

Extension tokens are random, expire after 90 days, are displayed once, and are stored only as SHA-256 hashes. They authorize only creation through the reviewed capture endpoint. Tokens remain in extension-local storage and are never passed to page scripts. Revoke a token immediately if the device or token is lost.

## Notification delivery

Notification preferences and Web Push subscriptions are scoped to the authenticated user. Push endpoints and encryption keys are operational credentials and are never returned through another user's API. VAPID private keys and SMTP passwords belong in local environment files or protected GitHub environment secrets, never source control. Browser push requires HTTPS outside localhost. Notification payloads contain the reminder description, company, role, and application path, so users should avoid sensitive reminder text on shared devices.

## Dependency and supply-chain controls

CI runs `npm audit --audit-level=high` against both application lockfiles and blocks verification when a high or critical advisory is present. Dependabot checks both npm projects weekly and groups Prisma package updates so an upstream patched Prisma release is reviewed promptly. Eligible Dependabot pull requests are automatically queued for squash merge only when they update an npm package by a patch version and all `Verify` checks are successful; major, minor, non-npm, and failed-check updates remain manual. The auto-merge workflow runs without checking out pull-request code and requires the protected `master` branch checks. Prisma 7.9.1 currently requests vulnerable `deepmerge-ts@7.1.5`; the backend temporarily overrides that transitive package to patched `deepmerge-ts@8.0.2` without downgrading Prisma. Remove the override after a supported Prisma release adopts the patched dependency, then regenerate and review the lockfile.

## Operational expectations

- Prefer HTTPS for any public login deployment.
- Restrict PostgreSQL and backend ports from the public internet.
- Rotate credentials after exposure and revoke affected sessions.
- Back up PostgreSQL and test restores regularly.
- Review dependency and container-image updates before release.

## Recovery, sharing, and portable data

Password-reset and email-verification links use 256-bit random tokens; only SHA-256 hashes are stored. Links expire and are single-use, recovery requests do not disclose account existence, and password reset revokes all sessions. Account deletion requires the exact account email and the current password for password users; S3 objects are queued before database cascades.

Workspace membership is validated server-side. Owners and administrators manage invitations, members edit shared applications, viewers are read-only, and the final owner cannot be removed or demoted. Calendar subscription URLs are revocable bearer secrets and responses are not cached. Portable JSON excludes passwords, sessions, OAuth data, private tokens, storage keys, and resume bytes.
