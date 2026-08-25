# Database model

PostgreSQL is managed through Prisma migrations in `backend/prisma/migrations`. Do not edit an applied migration.

The `20260815090000_revoke_legacy_demo_passwords` security migration clears password hashes for the two legacy demo usernames whose credentials were previously published. Runtime bootstrap assigns a replacement hash only when operators provide a complete demo identity through environment configuration; the migration does not delete either user or their data.

## Application discovery indexes

Application discovery uses compound B-tree indexes aligned with user/workspace ownership, supported sort fields, status filtering, and the stable identifier tie-breaker used by pagination. PostgreSQL's `pg_trgm` extension supplies GIN trigram indexes for case-insensitive contains searches across company, job title, location, and source.

Migration `20260814021000_optimize_application_discovery` replaces the earlier shorter application indexes with pagination-aware variants and creates the trigram indexes. Apply it with `cd backend && npm run db:migrate`. Portable-data imports prefetch all matching application identities once before transactional writes, and account deletion queues all owned resume-object deletions with one bulk insert.

## Relationships

```text
User
├── Application
│   ├── ApplicationEvent
│   ├── ApplicationReminder
│   ├── ApplicationResume
│   ├── ApplicationCoverLetter
│   └── GmailUpdateReview
├── Sprint ── Application
├── BrowserExtensionToken
├── NotificationPreference
├── PushSubscription
├── ResumeVersion ── Application
└── GmailConnection
    └── GmailMessage
        └── GmailUpdateReview

Session
ResumeObjectDeletion
```

## Models

- `User`: login identity and owner of applications, reusable resume tags (`ResumeVersion` records), and Gmail data.
- `Session`: server-side authenticated session with an expiry timestamp.
- `Application`: company, role, location, URL, source, status, notes, applied date, optional resume tag, and an optional captured posting snapshot. Structured capture fields include a skills list, experience requirements, salary minimum/maximum/currency/period, and `REMOTE`, `HYBRID`, or `ONSITE` work mode.
- `Sprint`: a workspace- or user-scoped active/closed job-search cycle with a whole-day `durationDays` and calculated `endsAt`. A sprint remains active after its end until a user starts the next one; that transition closes the previous cycle, keeps rejected applications with that closed sprint, and carries other applications into the new cycle.
- `ApplicationEvent`: chronological note or status transition. Status events record both previous and new status.
- `ApplicationReminder`: follow-up or deadline with due and completion timestamps.
- `ApplicationResume`: one uploaded résumé per application. Stores either legacy database bytes or a private S3 key.
- `ApplicationCoverLetter`: one uploaded cover letter per application. Stores either database bytes for local development or a private S3 key.
- `ResumeVersion`: reusable user-defined resume label used to compare application outcomes.
- `ResumeObjectDeletion`: durable retry queue for S3 objects that could not be deleted immediately.
- `GmailConnection`: one encrypted Gmail authorization per user, including incremental history state, automatic-sync interval, enablement, last worker attempt, and sanitized retry status.
- `GmailMessage`: deduplicated reference to a synchronized Gmail message, including the classifier version last applied so improved rules can re-evaluate older unmatched references once.
- `GmailUpdateReview`: user-reviewed status suggestion or proposed new application derived from Gmail metadata.
- `BrowserExtensionToken`: named, expiring, revocable capture access. Stores a SHA-256 token hash and display prefix, never the bearer secret.
- `NotificationPreference`: one user-owned choice of email and browser-push reminder channels.
- `PushSubscription`: user-owned browser push endpoint and encryption keys. A user can register multiple browsers.
- `ReminderDelivery`: successful per-reminder, per-channel delivery marker used to prevent repeat notifications.

Deleting a user cascades through owned records. Deleting an application cascades through its events, reminders, and attachment; linked Gmail reviews retain their review record with the application link cleared where configured.

## Persistence and backup

Docker Compose stores PostgreSQL data in the named `postgres-data` volume. Normal container recreation and instance restart preserve it. `docker compose down --volumes` intentionally deletes local database data. Production backups must copy PostgreSQL data independently of Docker image releases and should be tested with a restore procedure before schema changes.

Redis queue state uses the separate named `redis-data` volume. Enabled schedules are also persisted in PostgreSQL and reconciled into Redis, so Redis can be rebuilt without losing the user's scheduling preference or Gmail history cursor.

## Accounts, workspaces, and calendars

`EmailVerificationToken` and `PasswordResetToken` store expiring single-use SHA-256 hashes. `Session.userId` supports global session revocation. `Workspace`, `WorkspaceMember`, and `WorkspaceInvitation` provide personal/shared ownership and role-based membership; existing applications are backfilled to personal workspaces. `CalendarFeedToken` stores only a revocable feed-token hash. Portable workspace JSON intentionally excludes credentials, sessions, tokens, S3 keys, and attachment bytes and is not a substitute for an operational PostgreSQL backup.

`CalendarItem` stores user-owned tasks, events, and reminders with a required start, optional end and description, and an optional owned application relationship.

Sprint transitions are persisted in one Prisma transaction after the current sprint's `endsAt` has passed. The transition creates the next active sprint, closes the previous one, and moves non-rejected applications together so a failed transition cannot leave the sprint membership half-updated. Applications that remain assigned to closed sprints stay available through the archived-sprint read path. New applications connect to the active sprint when one exists. The sprint migration is additive and preserves applications that existed before sprint tracking; existing sprints are backfilled with a 14-day duration and end timestamp, and the first sprint started by a user or workspace claims unassigned applications.

Migration `20260824090000_add_sprints` adds the `SprintStatus` enum, sprint records, and an optional application-to-sprint relationship without changing existing application statuses or deleting existing applications. Migration `20260824100000_add_sprint_duration` adds the persisted sprint duration and end timestamp, backfilling existing sprints to 14 days.
