# Coding agent instructions

These instructions apply to the entire repository. More specific `AGENTS.md` files may add package-level rules in the future.

## Mission

Build the Job Application Tracker incrementally as a full-stack monorepo. The current goal is V0.1: users can create, list, open, edit, and delete applications through React, with data stored persistently in PostgreSQL through Express and Prisma.

Treat [`features/v0.1`](features/v0.1) as the active behavior contract and [`features/roadmap`](features/roadmap) as future intent. Do not implement roadmap features unless the user explicitly requests them.

## Required boundaries

- Keep `frontend` and `backend` as separate applications.
- Do not replace Express with framework API routes.
- Follow `Route -> Validation -> Controller -> Service -> Prisma` on the backend.
- Follow `Component -> Hook -> TanStack Query -> API service` on the frontend.
- Keep business logic out of Express route declarations and React components.
- Validate backend input even when the frontend validates the same data.
- Keep PostgreSQL as the source of truth for application data.

## Scope control

Do not add Gmail, OAuth, Redis, BullMQ, workers, browser extensions, AI classification, analytics, or production infrastructure unless the task explicitly selects that feature. A Gherkin file under `features/roadmap` is documentation, not authorization to implement it.

Avoid speculative abstractions, generic repositories, dependency injection frameworks, shared packages, and dependencies that are not required by the selected behavior.

## Before changing code

1. Read the relevant feature file and nearby implementation.
2. Inspect package scripts, TypeScript settings, Prisma schema, and existing conventions.
3. Identify whether the task affects the frontend, backend, database, or a vertical slice.
4. Preserve unrelated user changes and existing working behavior.
5. State any assumption that could materially change product behavior.

## Implementation rules

### Application domain

The initial statuses are `SAVED`, `APPLIED`, `SCREENING`, `ASSESSMENT`, `INTERVIEW`, `OFFER`, `REJECTED`, and `WITHDRAWN`. Do not silently rename or expand them.

An application initially contains company, job title, optional location, job URL, source, status, notes, applied date, and managed timestamps. Prisma migrations are required for model changes.

When timeline work is selected, status updates and their `ApplicationEvent` records must be written in one Prisma transaction. The frontend must not create the corresponding status event separately.

### Backend

- Routes only compose paths, middleware, and controllers.
- Controllers translate HTTP input and service results into responses.
- Services contain business rules and Prisma calls.
- Validators own Zod request schemas.
- Use explicit types and avoid `any`.
- Distinguish validation, missing-resource, conflict, and unexpected errors.
- Do not return internal stack traces or Prisma details to clients.
- Use environment variables for configuration.

### Frontend

- Use the Axios API client configured by `VITE_API_URL`.
- Put application requests in service modules.
- Wrap server state in TanStack Query hooks.
- Build forms with React Hook Form and Zod.
- Use Chakra UI as the frontend component and styling system.
- Prefer Chakra components, theme tokens, responsive props, and accessibility behavior over ad hoc CSS.
- Keep application-specific styling in the Chakra theme or component props; use standalone CSS only when Chakra cannot express the requirement cleanly.
- Include loading, empty, validation, API error, and success behavior.
- Prioritize functional, accessible UI over premature visual polish.

### Security and privacy

- Never read secrets into user-facing output or commit `.env` files.
- Never log OAuth tokens or full sensitive email content.
- Once authentication exists, scope every owned-resource query to the authenticated user.
- Do not allow raw classifier or LLM output to mutate the database.

## Behavior specifications

Follow [the feature specification standard](docs/standards/feature-files.md), [the testing standard](docs/standards/testing.md), and [the definition of done](docs/standards/definition-of-done.md).

Update Gherkin whenever a task changes observable behavior:

- Current release behavior belongs in `features/v0.1`.
- Unimplemented plans belong in `features/roadmap`.
- Scenarios should state user-visible outcomes and remain independent of selectors and internal function names.
- Do not weaken a scenario merely to make an implementation pass.

Update the root `README.md` whenever a feature adds or changes user-visible behavior. Create it if it does not exist, list only behavior that is implemented and usable, and describe the feature in user-facing language rather than internal architecture terms. Do not present roadmap scenarios as available features.

## Verification

Run checks proportionate to the changed surface:

```bash
cd backend && npx tsc --noEmit
cd frontend && npm run lint && npm run build
```

Run relevant automated tests once their scripts exist. For API changes, exercise success and expected failure status codes against a test or local database. For full-stack changes, verify the complete React-to-PostgreSQL path. For persistence changes, confirm records survive a PostgreSQL container restart.

Do not report a feature as complete when only one layer is implemented. Clearly distinguish code that was type-checked from behavior that was exercised at runtime.

## Change hygiene

- Make the smallest coherent change that completes the requested behavior.
- Do not overwrite unrelated edits or use destructive Git commands.
- Do not edit generated Prisma client files manually.
- Do not rewrite applied migrations; create a new migration.
- Update setup documentation when commands, ports, or environment variables change.
- Update the root README's feature documentation when user-visible behavior changes.
- Mention material warnings, skipped checks, and known limitations in the handoff.

## Release versioning

Before finalizing completed work, follow the repository's [release-version skill](skills/update-release-version/SKILL.md). Classify the combined unreleased changes, update only the root `package.json` when a major, minor, or patch release is required, and add categorized user-facing entries to `CHANGELOG.md`. Leave the version and changelog unchanged for documentation, tests, Gherkin clarification, or agent-guidance-only changes.

## Commit and push completed work

After every new feature or bug fix satisfies the definition of done and release versioning is complete, follow the repository's [commit-and-push skill](skills/commit-and-push-changes/SKILL.md). The repository owner authorizes a normal, non-force push of the completed commit to the current configured branch. Use an informative Conventional Commit subject and body that describe the delivered behavior and release version.

Do not push incomplete or failing work, secrets, unrelated user changes, documentation-only maintenance unless explicitly requested, or any change when the user explicitly says not to commit or push. Never force-push, bypass hooks, or create release tags manually.

## Definition of done

A selected feature is done when its relevant scenarios are satisfied, changed logic has unit coverage, the root README documents the delivered user-visible behavior, types and builds pass, expected errors are handled, data behavior is verified, the release impact has been classified and versioned when required, no unrelated roadmap scope was introduced, and the contributor can reproduce any required setup or migration commands.
