# Job Application Tracker

A secure job application workspace for individuals and teams, with applications, resumes, timelines, reminders, Gmail updates, calendar feeds, and portable data.

The stack is React, Chakra UI, Express, Prisma, and PostgreSQL. Docker Compose runs the complete application.

## Quick start

Requirements: Docker and Docker Compose.

```bash
docker compose up --build
```

Open <http://localhost:5173> and sign in with the built-in demo account:

```text
Username: demo
Password: JobTrackerDemo123!
```

The second demo account, also created automatically in production, is:

```text
Username: demo2
Password: JobTrackerDemo456!
```

These credentials are intentionally public and suitable only for a demo deployment. Do not use them for sensitive data.

Useful local URLs:

| Service | URL |
| --- | --- |
| Application | <http://localhost:5173> |
| API health | <http://localhost:3000/api/health> |
| Prisma Studio | `cd backend && npx prisma studio` |

PostgreSQL data is persisted in the `postgres-data` Docker volume. Stop containers without deleting data with `docker compose down`. To intentionally reset the database:

```bash
docker compose down --volumes
```

Create an operational PostgreSQL backup with `./scripts/backup-database.sh`. Restore it only after reviewing the target with `CONFIRM_RESTORE=jobtracker ./scripts/restore-database.sh ./backups/<file>.dump`. Workspace JSON export/import is intended for portability and excludes resume file bytes and secrets.

## Features

- Create, search, progressively filter, sort, edit, and delete applications with indexed server-side discovery and bounded pagination, plus quick status, note, and reminder actions from application details.
- Use a responsive workspace with consistent icons, grouped desktop navigation, mobile shortcuts, application cards on phones, and a tabbed mobile status board.
- Work in a consistent accessible light or dark design system with compact semantic application-status badges, focused page hierarchy, responsive forms, and page-shaped loading states.
- Track application timelines, notes, status changes, follow-ups, and deadlines.
- Receive due follow-ups and deadlines through opt-in email or browser push notifications with automatic retry.
- Upload, replace, download, and review private PDF, DOC, and DOCX resumes up to 5 MB.
- Review uploaded PDF resumes in a private in-application preview portal, with application details and a new-tab fallback for other document formats.
- Store new production resume bytes in private S3 using short-lived browser permissions and the EC2 instance role.
- Keep legacy database-backed resumes downloadable and migrate them to S3 at startup.
- Keep uploaded résumé documents in a private preview library, label résumé strategies with suggested or custom tags, and compare outcomes by tag.
- Scan headline metrics, act on a compact list of due or inactive applications, and switch between source and résumé-tag insights from the dashboard.
- Receive accessible in-app confirmation after important create, update, status, reminder, tag, and synchronization actions.
- Connect Gmail for manual or scheduled incremental metadata synchronization, deduplication, retryable background processing, and user-confirmed application updates. Deterministic rules classify known recruitment messages, with an optional validated LLM fallback for ambiguous messages. New applications created from Gmail reviews can include a résumé tag and private résumé upload.
- Capture job postings from a clean light/dark Manifest V3 extension workflow, review or refresh extracted details, and preserve skills, experience requirements, salary, location, work mode, original URL, description, and capture date with revocable user-scoped access.
- Switch between light and dark themes.
- Keep applications, Gmail data, resumes, reminders, and analytics scoped to the signed-in user.
- Create a private account with a unique username and email, then enter the workspace immediately through an authenticated session.
- Recover password accounts through expiring single-use email links, verify account email addresses, edit profile details, and permanently delete an account with reauthentication.
- Create team workspaces, invite members with role-based access, switch between personal and shared application data, and preserve at least one workspace owner.
- Export a workspace as privacy-filtered JSON and import supported exports atomically, with duplicate applications safely skipped.
- Review deadlines and interview milestones in a responsive month calendar, click a date to add a persistent task, event, or reminder with an optional application link, download everything as an iCalendar file, or create a revocable private subscription URL.
- Protect password login with progressive delays, temporary account and network limits, uniform credential failures, and sanitized security events.
- Use custom accessible dropdown menus for application filtering and form selections.
- Let server-authorized administrators search and review paginated account summaries, verification status, authentication methods, signup dates, and high-level usage counts without exposing credentials or private user content.

Supported application statuses: `SAVED`, `APPLIED`, `SCREENING`, `ASSESSMENT`, `INTERVIEW`, `OFFER`, `REJECTED`, and `WITHDRAWN`.

## Configuration

Local configuration is documented in [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example). The Docker Compose defaults work without additional configuration.

The first built-in demo account (`demo@jobtracker.invalid`) has administrator access by default. Its credentials are public and must not be used with private account data. Set `ADMIN_ACCOUNT_EMAILS` to a comma-separated list of application login emails to replace that default with explicitly authorized administrators. Administrator-reserved emails cannot create accounts through public password signup or Google account creation; those accounts must already exist or be provisioned outside the application signup flow.

For production resume storage, configure:

```text
AWS_REGION=us-east-1
RESUME_BUCKET=jatbucket2799
RESUME_UPLOAD_EXPIRES_SECONDS=300
```

The EC2 instance role must allow `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` for `arn:aws:s3:::<bucket>/resumes/*`. Do not add static AWS keys to GitHub, Docker Compose, or application environment files.

The S3 bucket should keep Block Public Access enabled, allow CORS from the exact application origin, and expire `resumes/pending/` objects after one day. See [the deployment guide](docs/deployment.md) for the complete policy, CORS, instance, and GitHub setup.

Without `RESUME_BUCKET`, local development uses PostgreSQL for resume bytes. This fallback also preserves compatibility with existing database-backed attachments.

Gmail requires a Google OAuth client and these variables:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GMAIL_CALLBACK_URL
```

Local callbacks may use `http://localhost:3000/api/gmail/callback`. Public OAuth deployments require an HTTPS domain and Google consent-screen configuration. Gmail remains optional.

Ambiguous Gmail messages can optionally use OpenAI after deterministic classification returns no result:

```text
OPENAI_API_KEY
OPENAI_ALLOWED_ACCOUNT_EMAILS=user@example.com
OPENAI_GMAIL_MODEL=gpt-5-mini
OPENAI_GMAIL_CONFIDENCE_THRESHOLD=80
OPENAI_GMAIL_TIMEOUT_MS=10000
```

`OPENAI_API_KEY` is optional and server-side only. `OPENAI_ALLOWED_ACCOUNT_EMAILS` is a comma-separated allowlist of application login emails; it defaults to empty, so configuring a key alone grants no account access. When the signed-in account is not allowed—or the provider times out, fails, or returns invalid or insufficiently confident output—Gmail synchronization continues with the deterministic classifier and leaves that ambiguous message unmatched. The fallback validates structured output and only creates a review suggestion; it never changes an application directly.

The SMTP configuration also sends password-reset and email-verification links. Without SMTP, authentication and profile management continue to work, while recovery requests return a non-disclosing acknowledgement without sending mail. Set `PUBLIC_API_URL` to the externally reachable backend origin so calendar subscription URLs work outside the browser.

Redis protects password login from repeated account and network attempts and also supports automatic Gmail synchronization through a separate BullMQ worker. Docker Compose configures it automatically. When running services separately, set `REDIS_URL=redis://localhost:6379`, build the backend, and run `npm run start:worker` for scheduled work.

Reminder delivery is optional. Generate Web Push credentials with `npx web-push generate-vapid-keys`, then configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a `VAPID_SUBJECT` such as `mailto:admin@example.com`. Email delivery requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and provider credentials in `SMTP_USER` and `SMTP_PASSWORD` when required. The Notifications page shows unavailable channels until their server configuration is complete.

## API overview

All management and user-data endpoints require an authenticated session and enforce user or workspace membership. The calendar feed is the exception: its high-entropy URL is a revocable bearer secret for calendar clients that cannot send a session cookie.

| Area | Endpoints |
| --- | --- |
| Health and auth | `GET /api/health`, `POST /api/auth/signup`, `GET /api/auth/session`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/verify-email`, `GET /api/auth/google` |
| Account | `GET/PATCH/DELETE /api/account` |
| Workspaces | `GET/POST /api/workspaces`, plus members and invitations under `/api/workspaces/:id` |
| Data portability | `GET /api/data/export`, `POST /api/data/import` |
| Calendar | `GET /api/calendar/export`, `GET/POST/DELETE /api/calendar/subscription`, `GET /api/calendar/feed/:token` |
| Applications | `GET/POST /api/applications`, `GET/PATCH/DELETE /api/applications/:id`, `GET /api/applications/search` |
| Resume uploads | `POST/DELETE /api/applications/resume-uploads`, `GET /api/applications/:id/resume`, `GET /api/applications/:id/resume-download` |
| Uploaded resume library | `GET /api/resumes/uploads` |
| Resume tags (API name: resume versions) | `GET/POST /api/resumes`, `PATCH/DELETE /api/resumes/:id` |
| Timeline | `GET/POST /api/applications/:id/events` |
| Reminders | `GET /api/reminders`, `GET /api/reminders/suggestions`, `POST /api/reminders/suggestions/:id`, `PATCH/DELETE /api/reminders/:id` |
| Notifications | `GET/PATCH /api/notifications/settings`, `POST/DELETE /api/notifications/subscriptions` |
| Dashboard | `GET /api/dashboard/summary` |
| Gmail | `GET /api/gmail/status`, `GET /api/gmail/connect`, `POST /api/gmail/sync`, `PATCH /api/gmail/schedule`, `GET /api/gmail/reviews`, `PATCH /api/gmail/reviews/:id`, `DELETE /api/gmail/connection` |
| Browser extension | `GET/POST /api/browser-extension/tokens`, `DELETE /api/browser-extension/tokens/:id`, `POST /api/browser-extension/captures` |

API responses include `Server-Timing` and `X-Response-Time-Ms` headers. Application list/search responses also report aggregate database duration and query count; query text, parameters, and request data are not logged or retained. The applications table uses the requested page size, while board and chooser views load every application through bounded pages of 50.

## Development

Interactive backend API documentation: [Swagger UI](http://localhost:3000/api-docs/) (available while the backend is running). The machine-readable OpenAPI document is available at [openapi.json](http://localhost:3000/api-docs.json). See the [API documentation guide](docs/api.md) for maintenance and authentication details.

Run PostgreSQL through Docker and start the applications separately:

```bash
docker compose up -d postgres

cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Run the standard checks:

```bash
cd backend && npm test && npm run typecheck && npm run build
cd ../frontend && npm test && npm run lint && npm run build
```

Run the critical browser workflows with PostgreSQL available at the backend `DATABASE_URL`:

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

Playwright migrates and seeds the test database, starts the backend and frontend on ports `3001` and `4173`, and covers login/logout, application CRUD and validation, board/timeline/reminder workflows, resume tags and uploads, dashboards, notification capabilities, themes, and responsive layouts. Pull-request verification runs this suite against isolated PostgreSQL and uploads traces, screenshots, videos, and the HTML report after failures.

## Production deployment

Production is served at <https://d2g95c1jos960v.cloudfront.net>.

The production Compose stack runs frontend, backend, and PostgreSQL on EC2. PostgreSQL uses a named Docker volume and survives normal deployments and instance restarts. CloudFront provides the browser-facing HTTPS URL and forwards `/api` to the EC2 frontend proxy.

Pushes to `master` run verification first. When the root `package.json` version has not been released, GitHub Actions publishes versioned images, deploys them to EC2, and creates the matching GitHub Release from `CHANGELOG.md`. Deployment uses short-lived GitHub OIDC credentials and temporary runner SSH access.

The existing AWS infrastructure is described in [infrastructure](infrastructure/README.md). Terraform adopts EC2, Elastic IP, CloudFront, WAF, S3, IAM, and GitHub OIDC resources into encrypted, versioned remote state with native S3 locking. Terraform does not deploy the application or manage Docker volumes and must not be applied until its import plan has been reviewed for replacement or deletion.

To create an isolated production environment and start every service with one interactive command, authenticate the AWS CLI and GitHub CLI, install Terraform 1.10+, and run `./scripts/provision-production.sh`. The command shows saved Terraform plans for approval, provisions the stack without SSH, starts Docker Compose through Systems Manager, configures GitHub deployment variables, and waits for the public HTTPS health check.

The built-in demo credentials are public. Do not use this deployment for sensitive personal data without changing the authentication and deployment configuration.

Read [docs/deployment.md](docs/deployment.md) before configuring a new instance.

## Documentation

- [Contributing guide](CONTRIBUTING.md)
- [Release changelog](CHANGELOG.md)
- [Agent instructions](AGENTS.md)
- [Project skills](SKILLS.md)
- [Current behavior specifications](features/v0.1)
- [Roadmap specifications](features/roadmap)
- [Development standards](docs/standards)
- [Production deployment guide](docs/deployment.md)
- [Terraform infrastructure guide](infrastructure/README.md)
- [Backend API and Swagger guide](docs/api.md)
- [Architecture](docs/architecture.md)
- [Database model](docs/database.md)
- [Security and privacy](docs/security.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Browser extension setup and security](docs/browser-extension.md)
