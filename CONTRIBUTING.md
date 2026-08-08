# Contributing

Thank you for contributing to the Job Application Tracker. This repository contains separate React and Express applications backed by PostgreSQL.

## Product direction

The current target is V0.1: a dependable application CRUD workflow from React through Express and Prisma to PostgreSQL. Work on authentication, Gmail, Redis, BullMQ, AI, browser extensions, analytics, and background jobs only when the relevant roadmap feature is explicitly selected.

The behavior specifications in [`features/v0.1`](features/v0.1) define the current release. [`features/roadmap`](features/roadmap) records future intent and is not evidence that a feature is implemented.

## Architecture

Keep the applications separate:

```text
React :5173 -> Express :3000 -> Prisma -> PostgreSQL :5432
```

Backend request flow:

```text
Route -> Validation -> Controller -> Service -> Prisma
```

Frontend data flow:

```text
Component -> Custom hook -> TanStack Query -> API service -> Express
```

Routes define endpoints, controllers handle HTTP concerns, services own business logic, and validators define Zod schemas. Do not place substantial business logic in route declarations or React components.

## Local setup

Prerequisites:

- A Node.js version supported by the installed dependencies
- npm
- Docker with Docker Compose

Start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

Configure uncommitted environment files:

```env
# backend/.env
DATABASE_URL=postgresql://jobtracker:jobtracker_dev@localhost:5432/jobtracker
PORT=3000

# frontend/.env
VITE_API_URL=http://localhost:3000/api
```

Apply database migrations and generate the client:

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

Run the applications in separate terminals:

```bash
cd backend
npx tsx src/server.ts
```

```bash
cd frontend
npm run dev
```

## Development workflow

Detailed requirements are maintained in:

- [Feature specification standard](docs/standards/feature-files.md)
- [Automated testing standard](docs/standards/testing.md)
- [Definition of done](docs/standards/definition-of-done.md)
- [Frontend UI standard](docs/standards/frontend-ui.md)

1. Choose one small behavior from the current milestone.
2. Update or add a Gherkin scenario when observable behavior changes.
3. Implement the smallest complete vertical slice.
4. Add unit tests for new or changed logic.
5. Update the root `README.md` with the delivered user-visible feature, creating it if needed.
6. Validate at every trust boundary, especially backend requests.
7. Test success, validation, not-found, loading, and failure paths as relevant.
8. Run the checks for every affected package.
9. Keep unrelated refactors out of the change.

Use short, focused branches such as `feature/application-form` or `fix/status-validation`. Write commits in the imperative mood, for example `Add application update validation`.

## Coding standards

### General

- Prefer readable, explicit code over clever abstractions.
- Use TypeScript types accurately; do not introduce `any` to bypass errors.
- Reuse domain types and schemas when ownership and runtime boundaries allow it.
- Avoid dependencies unless they solve a current, concrete problem.
- Preserve existing behavior unless the change intentionally updates its specification.
- Handle expected failures explicitly and use appropriate HTTP status codes.
- Never commit secrets, tokens, generated credentials, or local `.env` files.

### Backend

- Validate request bodies, parameters, and query strings with Zod.
- Keep HTTP request and response handling in controllers.
- Keep database and business operations in services.
- Use Prisma transactions when multiple writes must succeed or fail together.
- Return `201` for creation, `204` for successful deletion without a body, `400` for invalid input, `404` for missing resources, and `500` only for unexpected failures.
- Do not expose internal errors, credentials, or stack traces in API responses.
- Add migrations for schema changes; never edit an already-applied migration to represent a new change.

### Frontend

- Keep Axios calls in service modules rather than components.
- Access server state through TanStack Query hooks.
- Use React Hook Form and Zod for forms.
- Use Chakra UI for components, layout, theming, responsive styling, and accessible interaction patterns.
- Prefer Chakra theme tokens and component props over hardcoded visual values or broad global CSS.
- Represent loading, empty, error, and success states.
- Use `VITE_API_URL`; do not hardcode deployment URLs.
- Keep components focused and accessible with labels, keyboard support, and semantic elements.

## Gherkin standards

Feature specifications live at the repository root because they describe behavior across packages.

- Put current scope in `features/v0.1` and future scope in `features/roadmap`.
- Describe externally observable behavior, not CSS selectors or implementation calls.
- Give each scenario one clear outcome.
- Use `Background` only for context shared by every scenario in a feature.
- Use `Scenario Outline` for meaningful input variations.
- Tag scenarios by release and surface, such as `@v0.1`, `@api`, `@ui`, or `@roadmap`.
- Do not mark a roadmap scenario as implemented until its complete vertical path works.

## Testing expectations

The intended tools are Vitest and React Testing Library for frontend tests, Vitest or Jest with Supertest for backend tests, and Playwright for end-to-end tests.

At minimum, run the checks currently available:

```bash
cd backend
npx tsc --noEmit
```

```bash
cd frontend
npm run lint
npm run build
```

When test scripts are introduced, changes must also pass the relevant unit, integration, and end-to-end suites. Bug fixes should include a regression test whenever practical.

## Database changes

1. Update `backend/prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name <descriptive_name>` from `backend`.
3. Run `npx prisma generate`.
4. Review the generated SQL.
5. Verify existing records and API behavior remain valid.

Use descriptive snake-case migration names. Include migrations in the same change as the code that depends on them.

## Pull request checklist

- [ ] The change belongs to the active milestone or was explicitly requested.
- [ ] Relevant Gherkin behavior is added or updated.
- [ ] New or changed logic has relevant unit coverage.
- [ ] The root README documents new or changed user-visible features without listing roadmap work as available.
- [ ] Releasable features and fixes have categorized entries in the planned `CHANGELOG.md` version section.
- [ ] Frontend and backend responsibilities remain separated.
- [ ] Inputs are validated and expected errors are handled.
- [ ] Type checking, linting, builds, and relevant tests pass.
- [ ] Schema changes include a reviewed Prisma migration.
- [ ] No secrets or sensitive user/email content are logged or committed.
- [ ] Documentation and environment examples are updated when setup changes.
- [ ] The change is focused and does not prematurely implement roadmap systems.
