# Backend API documentation

The backend publishes an OpenAPI contract and renders it with Swagger UI:

- Local Swagger UI: <http://localhost:3000/api-docs/>
- Local OpenAPI JSON: <http://localhost:3000/api-docs.json>
- Production Swagger UI: `https://<application-origin>/api-docs/`

The OpenAPI document describes endpoint purpose, session authentication, path/query parameters, request bodies, response meanings, validation limits, and common conflicts. Swagger's **Try it out** feature can call the running API. Sign in through the application first so the browser has the `job-tracker-session` cookie.

Shared schemas and security definitions live in `backend/src/config/openapi.ts`. Endpoint-specific Swagger JSDoc belongs next to the matching Express route. `swagger-jsdoc` merges both sources at runtime.

When an API changes, update the route JSDoc, shared schema, validator, controller/service behavior, Supertest coverage, README API overview, and affected Gherkin scenario in the same change.

Browser capture uses the `extensionToken` bearer scheme instead of the session cookie. Token management remains session-authenticated, and the complete bearer value is returned only by token creation.
