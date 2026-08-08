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
- See loading, empty, and API error states.
- Create applications with validated fields.
- Open application details.
- Edit application details and status.
- Review a newest-first timeline of application activity.
- Add dated notes to an application's timeline.
- Record status changes automatically with their previous and new statuses.
- Delete applications after confirmation.
- Persist records in PostgreSQL.
- Sign in and sign out with Google.
- Sign in with the built-in demo account locally or in production.
- Keep every application private to the account that created it.
- Persist authenticated sessions in PostgreSQL using an HTTP-only cookie.

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
| `POST` | `/api/applications` | Create an application |
| `GET` | `/api/applications/:id` | Retrieve an application |
| `PATCH` | `/api/applications/:id` | Update an application |
| `DELETE` | `/api/applications/:id` | Delete an application |
| `GET` | `/api/applications/:id/events` | List an application's timeline events |
| `POST` | `/api/applications/:id/events` | Add a manual note to an application's timeline |

All application and timeline endpoints require an authenticated session. Requests cannot list or mutate applications owned by another user. Status updates and their timeline events are saved in one database transaction. Deleting an application also deletes its timeline. The known seeded demo records are assigned to the demo account during local seeding. Any other application created before ownership was introduced remains stored but quarantined as an unowned record.

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

The root `package.json` owns the application release version, and the matching section in `CHANGELOG.md` owns its categorized GitHub Release notes. Every push to `master` is verified. When its version has not been released before, GitHub Actions validates the changelog, publishes versioned frontend and backend images, deploys that version, and creates the corresponding `vMAJOR.MINOR.PATCH` GitHub Release. The first deployment generates protected PostgreSQL and session credentials on the instance, bootstraps the built-in demo user, and starts the database container with a persistent volume. Pushes with an unchanged version stop after verification.

The selected production deployment intentionally uses plain HTTP and publicly known demo credentials. Although the password is hashed in the database and records remain user-scoped, HTTP does not encrypt login credentials or session cookies in transit. Do not store sensitive data in this deployment or treat it as secure against unauthorized access or network interception.

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
