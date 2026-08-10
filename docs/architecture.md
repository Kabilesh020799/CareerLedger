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
```

The frontend and backend are independent TypeScript applications. PostgreSQL is the source of truth. Docker Compose runs PostgreSQL, the Express API, and the Nginx-served frontend.

## Backend boundaries

Requests follow `Route -> Validation -> Controller -> Service -> Prisma`. Routes compose middleware and handlers, validators define accepted input, controllers translate HTTP concerns, and services contain ownership rules, transactions, and persistence logic.

Protected routes use an HTTP-only session cookie. Every user-owned query is scoped to the authenticated user. Application status changes and timeline events are saved in one Prisma transaction.

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

Downloads use short-lived signed URLs. Local development can store file bytes in PostgreSQL when `RESUME_BUCKET` is unset. Files are limited to 5 MB and validated by extension, MIME type, and signature.

## Gmail synchronization

Google OAuth credentials are encrypted before storage. Manual synchronization fetches message metadata incrementally using Gmail history identifiers and deduplicates by Gmail message ID. Suggested changes remain pending until the user confirms, ignores, or creates an application.

## Production topology

CloudFront terminates browser HTTPS and forwards traffic to the EC2-hosted frontend proxy. The production Compose network keeps the API and database internal. GitHub Actions publishes versioned images, temporarily permits runner SSH access, deploys the selected version, verifies health, and rolls back on failure.
