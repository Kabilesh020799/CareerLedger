# Job Application Tracker

A full-stack application for creating, reviewing, updating, and deleting job applications. The stack uses React, Chakra UI, Express, Prisma, and PostgreSQL.

## Start the complete application

The only prerequisites are Docker and Docker Compose.

From the repository root, run:

```bash
docker compose up
```

Open:

- Application: <http://localhost:5173>
- API health check: <http://localhost:3000/api/health>

The first startup builds both applications, creates PostgreSQL, applies Prisma migrations, and inserts six demo applications. The seed is idempotent: later starts do not duplicate or overwrite existing demo records.

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

Inside Docker, the frontend sends `/api` requests through Nginx to the backend. The backend waits for PostgreSQL to become healthy before applying migrations and seeding data. The frontend waits for a healthy backend.

## Available functionality

- View applications in a table.
- See loading, empty, and API error states.
- Create applications with validated fields.
- Open application details.
- Edit application details and status.
- Delete applications after confirmation.
- Persist records in PostgreSQL.
- Load representative demo records on first startup.

Supported statuses are `SAVED`, `APPLIED`, `SCREENING`, `ASSESSMENT`, `INTERVIEW`, `OFFER`, `REJECTED`, and `WITHDRAWN`.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API availability |
| `GET` | `/api/applications` | List applications |
| `POST` | `/api/applications` | Create an application |
| `GET` | `/api/applications/:id` | Retrieve an application |
| `PATCH` | `/api/applications/:id` | Update an application |
| `DELETE` | `/api/applications/:id` | Delete an application |

## Development without Docker

Start only PostgreSQL:

```bash
docker compose up -d postgres
```

Then run the backend and frontend separately:

```bash
cd backend
npm install
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

The root `package.json` owns the application release version. Every push to `master` is verified. When its version has not been released before, GitHub Actions automatically creates the corresponding `vMAJOR.MINOR.PATCH` GitHub Release, publishes versioned frontend and backend images, and deploys that version. The first deployment generates protected PostgreSQL credentials on the instance and starts the database container with a persistent volume. Pushes with an unchanged version stop after verification.

See the [production deployment guide](docs/deployment.md) for the one-time instance and GitHub environment configuration.

## Project documentation

- [Contributing guide](CONTRIBUTING.md)
- [Agent instructions](AGENTS.md)
- [Project skills](SKILLS.md)
- [Current behavior specifications](features/v0.1)
- [Roadmap specifications](features/roadmap)
- [Development standards](docs/standards)
- [Production deployment guide](docs/deployment.md)
