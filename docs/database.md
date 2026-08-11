# Database model

PostgreSQL is managed through Prisma migrations in `backend/prisma/migrations`. Do not edit an applied migration.

## Relationships

```text
User
├── Application
│   ├── ApplicationEvent
│   ├── ApplicationReminder
│   ├── ApplicationResume
│   └── GmailUpdateReview
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
- `ApplicationEvent`: chronological note or status transition. Status events record both previous and new status.
- `ApplicationReminder`: follow-up or deadline with due and completion timestamps.
- `ApplicationResume`: one uploaded file per application. Stores either legacy database bytes or a private S3 key.
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
