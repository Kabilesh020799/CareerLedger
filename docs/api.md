# Backend API documentation

The backend publishes an OpenAPI contract and renders it with Swagger UI:

- Local Swagger UI: <http://localhost:3000/api-docs/>
- Local OpenAPI JSON: <http://localhost:3000/api-docs.json>
- Production Swagger UI: `https://<application-origin>/api-docs/`

## Performance timing and pagination

Every `/api` response includes a standard `Server-Timing` header and an `X-Response-Time-Ms` total. Database-backed application list and discovery requests add aggregate database duration and query count to `Server-Timing`. These measurements contain no SQL text, parameter values, request bodies, user identifiers, or retained history.

`GET /api/applications/search` is the bounded collection contract. It accepts `page` and a `limit` of `10`, `20`, or `50`, and returns `data` plus `page`, `limit`, `total`, and `pages` metadata. The frontend table requests the selected page; board and application-choice views fetch successive pages of 50 rather than requesting one unbounded response.

The OpenAPI document describes endpoint purpose, session authentication, path/query parameters, request bodies, response meanings, validation limits, and common conflicts. Swagger's **Try it out** feature can call the running API. Sign in through the application first so the browser has the `job-tracker-session` cookie.

Shared schemas and security definitions live in `backend/src/config/openapi.ts`. Endpoint-specific Swagger JSDoc belongs next to the matching Express route. `swagger-jsdoc` merges both sources at runtime.

When an API changes, update the route JSDoc, shared schema, validator, controller/service behavior, Supertest coverage, README API overview, and affected Gherkin scenario in the same change.

Browser capture uses the `extensionToken` bearer scheme instead of the session cookie. Token management remains session-authenticated, and the complete bearer value is returned only by token creation.

The capture request accepts reviewed posting fields plus optional structured `skills`, `experienceRequirements`, salary range/currency/period, and `REMOTE`, `HYBRID`, or `ONSITE` work mode. The interactive schema and validation limits are available in Swagger at `/api-docs`.

Notification endpoints use the authenticated session. Settings report whether SMTP and Web Push are available without returning secrets. Subscription endpoints register or remove only the current user's browser endpoint. Complete request shapes are documented in Swagger at `/api-docs`.

Password login applies Redis-backed progressive delay and temporary limits to both the normalized account and originating network address. Invalid credentials always return the same `401` body. An exceeded limit returns `429` and a `Retry-After` header containing the remaining lockout time. Redis degradation does not expose internal errors or prevent a valid login.

`POST /api/auth/signup` creates a password account when password authentication is enabled. It validates name, username, email, and password strength, returns `409` for a duplicate username or email, and starts the same server-side session used by login. Separate Redis account and network limits return `429` with `Retry-After` when signup is abused. Password confirmation is a frontend-only safeguard and is never stored or sent to the API.

`PATCH /api/gmail/reviews/:id` accepts an optional owned `resumeVersionId` and either multipart `resume` bytes or a prepared `resumeUploadKey` when creating a new application. It uses the same file validation, private S3/database storage, generated filename, and five-megabyte limit as the standard application form. The application, tag, attachment, and review resolution are committed together.

`POST /api/gmail/sync` applies deterministic recruitment-message rules first. When they return no result and `OPENAI_API_KEY` is configured, the server may use a schema-validated OpenAI classification above the configured confidence threshold to create a pending review. Missing configuration, provider failure, timeout, malformed output, or low confidence does not fail the endpoint and never mutates an application.

Account recovery uses generic `202` responses at `/api/auth/forgot-password` and `/api/auth/resend-verification`; one-time tokens are consumed by reset and verification endpoints. Profile management is under `/api/account`. Workspace membership and invitations are under `/api/workspaces`; application requests may send `X-Workspace-Id`. Portable export/import is under `/api/data`. The month view reads `GET /api/calendar/events`, and `POST /api/calendar/items` creates an authenticated user's task, event, or reminder after validating its time range. Calendar export and subscription management are under `/api/calendar`. `/api/calendar/feed/:token` is intentionally sessionless and protected by a revocable bearer token.

`GET /api/admin/users` requires both an authenticated session and an authorized application login email. An empty `ADMIN_ACCOUNT_EMAILS` value authorizes the first built-in demo account; a configured list replaces that default. The endpoint accepts `page`, `pageSize`, and optional `search` query parameters and returns aggregate account totals plus paginated account metadata. It never returns password hashes, Google identifiers, sessions, tokens, or private application content. The authentication session response includes a server-derived `isAdmin` flag so the frontend can hide administrator navigation; the API authorization check remains authoritative.
