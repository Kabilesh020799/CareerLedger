# Project skills and ownership map

This file maps project capabilities to the knowledge, files, standards, and verification needed to work on them. It is a navigation guide, not a claim that roadmap capabilities are implemented.

## Required development standards

Every feature change must follow these focused guides:

- [Feature specification standard](docs/standards/feature-files.md)
- [Automated testing standard](docs/standards/testing.md)
- [Definition of done](docs/standards/definition-of-done.md)
- [Frontend UI standard](docs/standards/frontend-ui.md)
- [Release versioning skill](skills/update-release-version/SKILL.md)

Write or update the feature specification before implementation, add unit tests with changed logic, and document delivered user-visible features in the root `README.md` before reporting a feature complete. Create the root README when the first feature needs to be documented. Describe only implemented behavior; keep roadmap features out of the user-facing feature list.

Use the release-version skill to classify SemVer and maintain the matching categorized section in `CHANGELOG.md`; GitHub Releases publish that section verbatim.

## Core skills for V0.1

### Repository and local infrastructure

**Purpose:** Maintain the monorepo and the local React, Express, Prisma, and PostgreSQL chain.

**Key areas:** repository root, Compose file, environment examples, package scripts, README documentation.

**Expected knowledge:** Docker Compose, npm, environment variables, service ports, persistent volumes.

**Completion evidence:** PostgreSQL starts cleanly, the backend connects, frontend and backend run independently, saved records survive a database-container restart, and the root README accurately lists the features available to users.

**Specifications:** `features/v0.1/health.feature`, `features/v0.1/data_persistence.feature`.

### Prisma and PostgreSQL modeling

**Purpose:** Define durable, type-safe application data.

**Key areas:** `backend/prisma/schema.prisma`, `backend/prisma/migrations`, generated Prisma client, `backend/src/config/prisma.ts`.

**Expected knowledge:** Prisma models, enums, relations, migrations, PostgreSQL, transactions, driver adapters.

**Standards:** migrations accompany schema changes; generated files are not manually edited; related writes use transactions.

**Completion evidence:** migration applies to a clean database, Prisma generation succeeds, type checking passes, and existing data remains valid.

### Express API development

**Purpose:** Expose predictable and validated REST behavior.

**Key areas:** `backend/src/routes`, `controllers`, `services`, `validators`, `middleware`, and `server.ts`.

**Expected knowledge:** Express, HTTP semantics, TypeScript, Zod, async error handling, Prisma.

**Standards:** routes compose, controllers handle HTTP, services own business logic, validators reject untrusted input.

**Completion evidence:** success and failure paths return correct statuses and bodies; `npx tsc --noEmit` passes.

**Specifications:** `features/v0.1/health.feature`, `application_crud.feature`, `application_validation.feature`.

### React application development

**Purpose:** Provide an accessible CRUD interface without leaking server concerns into components.

**Key areas:** `frontend/src/components`, `pages`, `layouts`, `hooks`, `services`, `schemas`, and `types`.

**Expected knowledge:** React, TypeScript, React Router, TanStack Query, React Hook Form, Zod, Axios, and Chakra UI.

**Standards:** components use hooks; hooks use TanStack Query; API services use the configured Axios client; forms expose validation and API failures; Chakra UI provides the component and styling system.

**Completion evidence:** lint and build pass, and create/read/update/delete behavior works through the browser against PostgreSQL.

**Specifications:** `features/v0.1/application_ui.feature`.

### Behavior-driven testing

**Purpose:** Turn product requirements into stable executable specifications.

**Key areas:** `features`, future step definitions, frontend/backend tests, and end-to-end tests.

**Expected knowledge:** Gherkin, Vitest, React Testing Library, Supertest, Playwright, test isolation, fixtures.

**Standards:** write or update scenarios before production code, specify observable outcomes, keep scenarios independent, cover expected failures, avoid implementation-specific steps, and map each scenario to the lowest reliable automated test layer.

**Completion evidence:** selected scenarios are current, changed logic has unit coverage, scenarios are automated at the cheapest reliable test layer, critical user journeys have end-to-end coverage, and implemented user-visible behavior is documented in the root README.

### Application timeline

**Purpose:** Preserve the history behind current application status.

**Expected knowledge:** relational modeling, cascading deletes, Prisma transactions, chronological UI.

**Critical rule:** changing status and creating its event must be atomic and initiated by the backend.

**Specification:** `features/v0.1/application_timeline.feature`.

## Roadmap skills

### Search and data navigation

**Purpose:** Support large application collections efficiently.

**Expected knowledge:** Prisma query construction, safe query validation, server-side filtering, sorting, pagination, URL state, query caching.

**Critical rule:** perform search, filtering, sorting, and pagination on the backend rather than loading the entire database into React.

**Specification:** `features/roadmap/application_discovery.feature`.

### Kanban and dashboard

**Purpose:** Visualize pipeline state and useful job-search outcomes.

**Expected knowledge:** responsive UI, accessible drag-and-drop, status mutation, aggregation queries, meaningful metrics.

**Critical rule:** board movement calls the backend, which owns status and timeline changes; do not add decorative analytics without decision value.

**Specification:** `features/roadmap/board_and_dashboard.feature`.

### Authentication and authorization

**Purpose:** Protect user-owned resources.

**Expected knowledge:** Google OAuth, secure sessions, token storage, authorization, user-scoped Prisma queries, CSRF and cookie security.

**Critical rule:** every application query must be scoped to the authenticated user, and OAuth tokens must never be exposed to React.

**Specification:** `features/roadmap/authentication.feature`.

### Gmail integration and classification

**Purpose:** Suggest application updates from recruitment email.

**Expected knowledge:** Gmail API, minimal OAuth scopes, incremental synchronization, deterministic text classification, confidence scoring, review workflows.

**Critical rules:** begin with manual sync and deterministic rules; deduplicate messages; require review for uncertain matches; never silently mutate records.

**Specification:** `features/roadmap/gmail_sync.feature`.

### Queues and workers

**Purpose:** Process synchronization, retries, schedules, and reminders outside the API process when asynchronous load requires it.

**Expected knowledge:** Redis, BullMQ, idempotency, retry and backoff policies, job observability, separate worker processes.

**Critical rule:** do not introduce Redis or BullMQ until synchronous/manual Gmail behavior works and asynchronous processing has a demonstrated need.

### AI fallback

**Purpose:** Classify ambiguous recruitment email after deterministic rules are insufficient.

**Expected knowledge:** structured model outputs, Zod validation, confidence thresholds, prompt evaluation, privacy controls.

**Critical rule:** AI is a fallback; raw output never directly updates the database.

**Specification:** the LLM fallback scenario in `features/roadmap/gmail_sync.feature`.

### Reminders and resume strategy

**Purpose:** Surface timely actions and measure which resume versions produce outcomes.

**Expected knowledge:** scheduled rules, dates and time zones, notifications, relational modeling, outcome analytics.

**Specification:** `features/roadmap/reminders_and_resumes.feature`.

### Browser job capture

**Purpose:** Save job posting details before listings disappear.

**Expected knowledge:** browser extensions, content scripts, user-confirmed extraction, stable public APIs, job-description storage.

**Critical rule:** do not depend on unsupported internal APIs or aggressively scrape job sites.

**Specification:** `features/roadmap/job_capture.feature`.

## Cross-cutting skills

### Security and privacy

Use minimum permissions, validate all external input, keep secrets server-side, avoid sensitive logs, use HTTPS in production, and authorize every user-owned resource.

### Observability and operations

Add useful structured logging and error monitoring when production operation begins. Track synchronization attempts and failures without logging tokens or unnecessary email bodies.

### CI/CD

The pull-request pipeline installs dependencies, lints, type-checks, tests, and builds both packages. The [release-version skill](skills/update-release-version/SKILL.md) classifies completed changes, updates the root version, and maintains categorized changelog entries. A new root version pushed to `master` publishes versioned Docker images, deploys production, and creates the GitHub Release from the matching `CHANGELOG.md` section.

## Skill selection rule

For each task, select only the skills required for the requested vertical slice. Follow the linked development standards, respect the active milestone, verify the complete affected path, and leave unrelated roadmap capabilities untouched.
