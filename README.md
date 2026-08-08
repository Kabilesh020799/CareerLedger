# Job Application Tracker

A full-stack application for creating, reviewing, updating, and deleting job applications. The stack uses React, Chakra UI, Express, Prisma, and PostgreSQL.

## Start the complete application

The only prerequisites are Docker and Docker Compose. The local stack includes a development-only account:

```text
Username: demo
Password: JobTrackerDemo123!
```

The password is stored as a bcrypt hash, not plaintext. Production uses a separate account supplied through GitHub environment secrets.

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
- Delete applications after confirmation.
- Persist records in PostgreSQL.
- Sign in and sign out with Google.
- Sign in with the seeded demo account during local development.
- Sign in with a deployment-specific username and password in production.
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

All application endpoints require an authenticated session. Requests cannot list or mutate applications owned by another user. The known seeded demo records are assigned to the demo account during local seeding. Any other application created before ownership was introduced remains stored but quarantined as an unowned record.

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

The root `package.json` owns the application release version. Every push to `master` is verified. When its version has not been released before, GitHub Actions automatically creates the corresponding `vMAJOR.MINOR.PATCH` GitHub Release, publishes versioned frontend and backend images, and deploys that version. The first deployment generates protected PostgreSQL credentials, bootstraps the production user from GitHub secrets, and starts the database container with a persistent volume. Pushes with an unchanged version stop after verification.

The selected production deployment intentionally uses plain HTTP. Although database passwords are hashed and records remain user-scoped, HTTP does not encrypt login credentials or session cookies in transit. Do not treat this deployment as secure against network interception.

See the [production deployment guide](docs/deployment.md) for the one-time instance and GitHub environment configuration.

## Project documentation

- [Contributing guide](CONTRIBUTING.md)
- [Agent instructions](AGENTS.md)
- [Project skills](SKILLS.md)
- [Current behavior specifications](features/v0.1)
- [Roadmap specifications](features/roadmap)
- [Development standards](docs/standards)
- [Production deployment guide](docs/deployment.md)
