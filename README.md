# Job Application Tracker

An account-private job application tracker for managing applications, resumes, timelines, reminders, Gmail updates, and outcome analytics.

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

## Features

- Create, search, filter, sort, edit, and delete applications.
- Use a responsive table and status board across phone, tablet, and desktop layouts.
- Track application timelines, notes, status changes, follow-ups, and deadlines.
- Upload, replace, download, and review private PDF, DOC, and DOCX resumes up to 5 MB.
- Review all uploaded resumes on the Resumes page with application details and private view links.
- Store new production resume bytes in private S3 using short-lived browser permissions and the EC2 instance role.
- Keep legacy database-backed resumes downloadable and migrate them to S3 at startup.
- Create reusable resume versions and compare their application outcomes.
- Review dashboard pipeline, source, resume, and milestone analytics.
- Connect Gmail for manual or scheduled incremental metadata synchronization, deduplication, retryable background processing, and user-confirmed application updates, including common application acknowledgements such as “Thank you for your application.”
- Capture job postings from a clean light/dark Manifest V3 extension workflow, review or refresh extracted details, and preserve the original URL, description snapshot, and capture date with revocable user-scoped access.
- Switch between light and dark themes.
- Keep applications, Gmail data, resumes, reminders, and analytics scoped to the signed-in user.

Supported application statuses: `SAVED`, `APPLIED`, `SCREENING`, `ASSESSMENT`, `INTERVIEW`, `OFFER`, `REJECTED`, and `WITHDRAWN`.

## Configuration

Local configuration is documented in [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example). The Docker Compose defaults work without additional configuration.

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

Automatic Gmail synchronization uses Redis and a separate BullMQ worker. Docker Compose configures both automatically. When running services separately, set `REDIS_URL=redis://localhost:6379`, build the backend, and run `npm run start:worker`.

## API overview

All application, resume, reminder, dashboard, and Gmail data endpoints require an authenticated session and enforce ownership.

| Area | Endpoints |
| --- | --- |
| Health and auth | `GET /api/health`, `GET /api/auth/session`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/google` |
| Applications | `GET/POST /api/applications`, `GET/PATCH/DELETE /api/applications/:id`, `GET /api/applications/search` |
| Resume uploads | `POST/DELETE /api/applications/resume-uploads`, `GET /api/applications/:id/resume`, `GET /api/applications/:id/resume-download` |
| Uploaded resume library | `GET /api/resumes/uploads` |
| Resume versions | `GET/POST /api/resumes`, `PATCH/DELETE /api/resumes/:id` |
| Timeline | `GET/POST /api/applications/:id/events` |
| Reminders | `GET /api/reminders`, `GET /api/reminders/suggestions`, `POST /api/reminders/suggestions/:id`, `PATCH/DELETE /api/reminders/:id` |
| Dashboard | `GET /api/dashboard/summary` |
| Gmail | `GET /api/gmail/status`, `GET /api/gmail/connect`, `POST /api/gmail/sync`, `PATCH /api/gmail/schedule`, `GET /api/gmail/reviews`, `PATCH /api/gmail/reviews/:id`, `DELETE /api/gmail/connection` |
| Browser extension | `GET/POST /api/browser-extension/tokens`, `DELETE /api/browser-extension/tokens/:id`, `POST /api/browser-extension/captures` |

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
