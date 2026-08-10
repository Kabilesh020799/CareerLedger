# Job Application Tracker

A full-stack application for creating, reviewing, updating, and deleting job applications. The stack uses React, Chakra UI, Express, Prisma, and PostgreSQL.

## Start the complete application

The only prerequisites are Docker and Docker Compose. The application includes this built-in demo account in local and production environments:

```text
Username: demo
Password: JobTrackerDemo123!
```

The bootstrap code stores the password as a bcrypt hash in PostgreSQL. These credentials are intentionally public and are suitable only for a demo deployment.

From the repository root, run:

```bash
docker compose up
```

Open:

- Application: <http://localhost:5173>
- API health check: <http://localhost:3000/api/health>

The first startup builds both applications, creates PostgreSQL, applies Prisma migrations, and seeds six applications owned by the demo user.

Run in the background with:

```bash
docker compose up -d
```

Rebuild after changing dependencies or Docker configuration:

```bash
docker compose up --build -d
```

Stop the application without deleting data:

```bash
docker compose down
```

Application data is stored in the `postgres-data` Docker volume and survives normal container restarts and `docker compose down`.

To intentionally remove all local database data and start fresh:

```bash
docker compose down --volumes
```

This final command permanently deletes the local PostgreSQL volume.

## Services

| Service | Address | Purpose |
| --- | --- | --- |
| Frontend | `http://localhost:5173` | React application served by Nginx |
| Backend | `http://localhost:3000` | Express REST API |
| PostgreSQL | `localhost:5432` | Persistent application database |

Inside Docker, the frontend sends `/api` requests through Nginx to the backend. The backend waits for PostgreSQL to become healthy before applying migrations. The frontend waits for a healthy backend.

## Available functionality

- View applications in a table.
- Search applications by company, job title, or location without case sensitivity.
- Combine status, source, and inclusive applied-date filters.
- Sort applications by applied date, creation date, update date, or company.
- Navigate server-paginated results with URL-persistent discovery controls.
- View all applications on an eight-column status board with per-column counts.
- Move board cards by drag-and-drop or an accessible status selector, with immediate feedback and automatic rollback on failure.
- Review user-scoped status totals, applications created since Monday, and current screening, interview, and offer progression rates on the dashboard.
- Compare response, interview, and offer counts and rates across normalized application sources, using each source's submitted applications as its denominator.
- Compare submitted application counts and screening, interview, and offer rates across private resume versions.
- See loading, empty, and API error states.
- Create applications with validated fields.
- Open application details.
- Edit application details and status.
- Review a newest-first timeline of application activity.
- Add dated notes to an application's timeline.
- Record status changes automatically with their previous and new statuses.
- Add follow-up and deadline reminders to an application.
- Complete, reopen, or delete reminders from application details.
- Review overdue and upcoming reminders on the dashboard and jump to their applications.
- See dashboard follow-up suggestions for applied applications with no activity or prior follow-up for more than seven days.
- Turn a follow-up suggestion into a reminder due the next day with one action.
- Switch between a polished light theme and a low-glare dark theme from the sign-in page or application navigation.
- Start with the device color preference and remember an explicitly selected theme across reloads.
- Use every primary workflow on phones, tablets, and computers with adaptive navigation, responsive forms and grids, and contained scrolling for wide data views.
- Create, rename, annotate, and delete private resume versions.
- Associate an optional resume version with each application and preserve the application if that version is deleted.
- Delete applications after confirmation.
- Persist records in PostgreSQL.
- Sign in and sign out with Google.
- Sign in with the built-in demo account locally or in production.
- Keep every application private to the account that created it.
- Persist authenticated sessions in PostgreSQL using an HTTP-only cookie.
- Connect Gmail through separate OAuth consent and manually synchronize recent and newly added message references.
- Deduplicate Gmail messages by provider ID, resume incremental synchronization from Gmail history, and recover automatically when a history cursor expires.
- Detect common application, assessment, interview, offer, rejection, and screening updates from synchronized Gmail metadata using deterministic rules.
- Review private Gmail suggestions, correct their application or status, confirm them with timeline history, ignore them, or create a proposed application only after confirmation.

Supported statuses are `SAVED`, `APPLIED`, `SCREENING`, `ASSESSMENT`, `INTERVIEW`, `OFFER`, `REJECTED`, and `WITHDRAWN`.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API availability |
| `GET` | `/api/auth/google` | Start Google sign-in |
| `GET` | `/api/auth/google/callback` | Complete Google sign-in |
| `POST` | `/api/auth/login` | Sign in with a username and password when enabled |
| `GET` | `/api/auth/session` | Read the current public user session |
| `POST` | `/api/auth/logout` | End the current session |
| `GET` | `/api/applications` | List applications |
| `GET` | `/api/applications/search` | Search, filter, sort, and paginate applications |
| `POST` | `/api/applications` | Create an application |
| `GET` | `/api/applications/:id` | Retrieve an application |
| `PATCH` | `/api/applications/:id` | Update an application |
| `DELETE` | `/api/applications/:id` | Delete an application |
| `GET` | `/api/applications/:id/events` | List an application's timeline events |
| `POST` | `/api/applications/:id/events` | Add a manual note to an application's timeline |
| `GET` | `/api/applications/:id/reminders` | List an application's reminders |
| `POST` | `/api/applications/:id/reminders` | Add a follow-up or deadline reminder |
| `GET` | `/api/reminders` | List the current user's open reminders |
| `GET` | `/api/reminders/suggestions` | List inactive applications eligible for a follow-up |
| `POST` | `/api/reminders/suggestions/:id` | Create a reminder from a follow-up suggestion |
| `PATCH` | `/api/reminders/:id` | Complete or reopen a reminder |
| `DELETE` | `/api/reminders/:id` | Delete a reminder |
| `GET` | `/api/resumes` | List the current user's resume versions |
| `POST` | `/api/resumes` | Create a resume version |
| `PATCH` | `/api/resumes/:id` | Update a resume version |
| `DELETE` | `/api/resumes/:id` | Delete a resume version |
| `GET` | `/api/dashboard/summary` | Retrieve current user-scoped pipeline totals and rates |
| `GET` | `/api/gmail/status` | Read private Gmail connection and synchronization status |
| `GET` | `/api/gmail/connect` | Start Gmail metadata authorization |
| `GET` | `/api/gmail/callback` | Complete Gmail authorization |
| `POST` | `/api/gmail/sync` | Manually synchronize Gmail message references |
| `GET` | `/api/gmail/reviews` | List the current user's pending Gmail update reviews |
| `PATCH` | `/api/gmail/reviews/:id` | Confirm, correct, create from, or ignore a Gmail update review |
| `DELETE` | `/api/gmail/connection` | Revoke and delete the current user's Gmail connection |

All application, timeline, reminder, resume, and dashboard endpoints require an authenticated session. Requests cannot list, aggregate, or mutate records owned by another user. Resume endpoints store version names and notes, not uploaded documents. An application can optionally reference one of its owner's resume versions; deleting that version clears the reference without deleting the application. Follow-up suggestions are evaluated when requested and require an `APPLIED` application whose latest application or timeline activity is more than seven days old and which has no existing follow-up reminder. Dashboard progression rates use all non-saved applications as the denominator and current active milestone statuses as the numerator. Resume outcome rates use only submitted applications associated with that resume version; saved and unassigned applications are excluded, and versions without submitted applications show unavailable rates. Source outcome analytics groups source names without regard to case or surrounding whitespace, excludes saved and unassigned applications from rate denominators, and treats current screening, assessment, interview, offer, and rejected statuses as responses. Sources without submitted applications show unavailable rates. The discovery endpoint accepts `search`, `status`, `source`, `appliedFrom`, `appliedTo`, `sortBy`, `sortOrder`, `page`, and `limit` query parameters and returns `{ data, pagination }`; supported page sizes are 10, 20, and 50. The original list endpoint remains available for existing clients. Status updates and their timeline events are saved in one database transaction. Deleting an application also deletes its timeline and reminders. The known seeded demo records are assigned to the demo account during local seeding. Any other application created before ownership was introduced remains stored but quarantined as an unowned record.

Gmail endpoints also require an authenticated session and remain scoped to the current user. Gmail authorization requests offline access to read-only metadata, encrypts OAuth credentials before storing them, and never returns tokens to React. The first sync stores up to 100 recent message IDs and thread IDs; later syncs use Gmail history and database uniqueness to avoid duplicates. New references and any pre-feature backlog are analyzed once. Message bodies and transient snippets are never stored; only detected recruitment updates retain the subject and sender required for review. Deterministic matching considers owned applications only, and no application changes until the user confirms. Confirmation saves the review decision, application change, and applicable timeline event in one transaction.

## Gmail configuration

Enable the Gmail API in a Google Cloud project and create a web OAuth client. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and an exact `GMAIL_CALLBACK_URL`. For direct local development the callback is `http://localhost:3000/api/gmail/callback`; the root Compose stack uses `http://localhost:5173/api/gmail/callback` through its frontend proxy.

Google permits HTTP OAuth callbacks only for localhost. A public deployment needs an HTTPS domain and must register `https://your-domain/api/gmail/callback`. The requested `gmail.metadata` scope is restricted; public use may require Google OAuth verification and a security assessment. Without Gmail credentials, the application remains usable and the Gmail page explains that integration is unavailable.

## Development without Docker

Start only PostgreSQL:

```bash
docker compose up -d postgres
```

Then run the backend and frontend separately:

```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Verification

```bash
cd backend
npm test
npm run typecheck
npm run build
```

```bash
cd frontend
npm test
npm run lint
npm run build
npm run test:e2e
```

## Production releases

The root `package.json` owns the application release version, and the matching section in `CHANGELOG.md` owns its categorized GitHub Release notes. Every push to `master` is verified. When its version has not been released before, GitHub Actions validates the changelog, publishes versioned frontend and backend images, deploys that version to EC2, and creates the corresponding `vMAJOR.MINOR.PATCH` GitHub Release. The first deployment generates protected PostgreSQL and session credentials on the instance, bootstraps the built-in demo user, and starts the database container with a persistent volume. Pushes with an unchanged version stop after verification.

Production is available at <https://d2g95c1jos960v.cloudfront.net>. CloudFront terminates browser-facing HTTPS and forwards uncached application requests to the EC2 frontend, which serves React and proxies `/api` to the private backend container. PostgreSQL remains private inside the Compose network.

Direct public HTTP access to the EC2 address is disabled; use the CloudFront URL. Deployments use short-lived GitHub OIDC credentials to permit SSH only from the active runner, then remove that ingress rule automatically.

The CloudFront-to-EC2 origin connection currently uses HTTP, so encryption is not end-to-end even though browser traffic and secure session cookies use HTTPS. The built-in demo credentials are public. Do not store sensitive data behind this shared demonstration account.

See the [production deployment guide](docs/deployment.md) for the one-time instance and GitHub environment configuration.

## Project documentation

- [Contributing guide](CONTRIBUTING.md)
- [Release changelog](CHANGELOG.md)
- [Agent instructions](AGENTS.md)
- [Project skills](SKILLS.md)
- [Current behavior specifications](features/v0.1)
- [Roadmap specifications](features/roadmap)
- [Development standards](docs/standards)
- [Production deployment guide](docs/deployment.md)
