# Architecture

## System overview

```text
Browser
  -> React + Chakra UI
  -> TanStack Query hooks
  -> Axios API services
  -> Nginx /api proxy
  -> Express routes
  -> Zod validation
  -> Controllers
  -> Services
  -> Prisma
  -> PostgreSQL

Redis <- BullMQ scheduler <- Express schedule API
  -> Gmail worker -> Gmail API -> PostgreSQL

Active browser tab -> extension content extraction -> editable popup
  -> bearer-authenticated capture API -> PostgreSQL
```

The frontend and backend are independent TypeScript applications. PostgreSQL is the source of truth. Docker Compose runs PostgreSQL, the Express API, and the Nginx-served frontend.

## Backend boundaries

Requests follow `Route -> Validation -> Controller -> Service -> Prisma`. Routes compose middleware and handlers, validators define accepted input, controllers translate HTTP concerns, and services contain ownership rules, transactions, and persistence logic.

Password signup and login create the same PostgreSQL-backed HTTP-only session cookie. Signup validates and normalizes identifiers before the credential service creates the user with a bcrypt password hash. Every user-owned query is scoped to the authenticated user. Application status changes and timeline events are saved in one Prisma transaction.

## Frontend boundaries

Frontend data follows `Component -> Hook -> TanStack Query -> API service`. React Hook Form and Zod handle forms, Chakra UI handles layout and accessibility, and Axios sends credentials to the backend. Mutations invalidate affected application, dashboard, reminder, resume, or Gmail query keys.

## Resume storage

Production resume uploads use a private S3 bucket:

```text
Browser -> request presigned upload -> Express verifies user and metadata
Browser -> direct POST to private S3 pending key
Browser -> save application with pending key
Express -> verify object -> promote to active key -> save attachment metadata
```

Downloads use short-lived signed URLs. The résumé library fetches owned PDF bytes through the authenticated API and renders a temporary browser object URL in an in-app preview; closing the preview revokes that URL. Local development can store file bytes in PostgreSQL when `RESUME_BUCKET` is unset. Files are limited to 5 MB and validated by extension, MIME type, and signature.

## Gmail synchronization

Google OAuth credentials are encrypted before storage. Manual synchronization fetches message metadata incrementally using Gmail history identifiers and deduplicates by Gmail message ID. Each stored reference records the classifier version last applied, allowing a newer rule set to re-evaluate older messages once without repeatedly scanning them. Suggested changes remain pending until the user confirms, ignores, or creates an application.

Creating an application from a Gmail review reuses the application résumé upload pipeline. Production uploads are prepared directly against private S3; local database fallback uses multipart bytes. The service verifies résumé-tag ownership and creates the application, generated résumé attachment, timeline note, and resolved review in one PostgreSQL transaction.

When a user enables automatic synchronization, the API persists the chosen interval and upserts a user-scoped BullMQ scheduler in Redis. A separate worker processes jobs with exponential retry backoff. Each job checks that the database schedule is still enabled before calling the same incremental synchronization service used by manual sync. Redis stores queue state; PostgreSQL remains authoritative for schedule settings, Gmail cursors, messages, and public failure status. API startup reconciles enabled database schedules into Redis after restarts.

## Password-login protection

Before password verification, the authentication controller asks the login-abuse service to atomically count opaque account and network references in Redis. The service applies progressive delay and temporary account/IP limits, while the credential service continues to use a fallback bcrypt comparison to avoid username-enumeration timing differences. Successful authentication clears the account counter. Sanitized JSON security events make failures, blocks, and Redis degradation observable without logging raw identifiers or credentials.

## Production topology

CloudFront terminates browser HTTPS and forwards traffic to the EC2-hosted frontend proxy. The production Compose network keeps the API and database internal. GitHub Actions publishes versioned images, temporarily permits runner SSH access, deploys the selected version, verifies health, and rolls back on failure.

## Browser capture

The extension content script reads only the active tab after a user action and extracts Schema.org posting metadata plus conservative page fallbacks. It returns proposed core fields and structured skills, experience, salary, location, and work mode to the popup. The popup owns the token and sends only the user-confirmed snapshot directly to the capture API. Session-authenticated web routes create/list/revoke tokens; the capture route validates the structured values, accepts only a valid capture token, and scopes the new application to its owner.

## Reminder delivery

The Notifications page stores user-scoped channel preferences and registers browser subscriptions through the authenticated API. The existing BullMQ worker runs a minute-based due-reminder job with exponential retry. It sends enabled channels through SMTP or Web Push and records successful `(reminder, channel)` deliveries in PostgreSQL so later scans do not resend them. Expired browser subscriptions are removed when their push provider returns 404 or 410.

## Production provisioning and deployment

The standalone Terraform stack creates the AWS network, EC2 host, encrypted EBS storage, private S3 resume bucket, CloudFront distribution, WAF, and least-privilege IAM roles. Cloud-init installs Docker but does not receive application secrets. The provisioning command starts the first Compose deployment through Systems Manager; later GitHub releases use OIDC, SSM commands, and short-lived encrypted Parameter Store values. PostgreSQL and Redis remain private Docker services whose named volumes live on the protected EC2 root volume.
