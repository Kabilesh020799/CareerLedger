# Automated testing standard

Tests are delivered with the feature they protect. New or changed logic requires unit tests, with integration or end-to-end tests added where boundaries make them necessary.

## Test placement

Keep unit tests close to the code they cover using the established naming convention, such as `application.service.test.ts`. Broader integration and end-to-end suites may use dedicated package-level test directories when introduced.

## Test-layer selection

| Behavior | Primary test layer |
| --- | --- |
| Zod field and query validation | Validator unit test |
| Business rule or classification | Service or pure-function unit test |
| HTTP status, response body, and middleware | Supertest API integration test |
| Prisma query or transaction behavior | Database integration test |
| Hook cache and mutation behavior | Hook or component test |
| Form interaction, loading, empty, and error states | React Testing Library test |
| Critical React-to-PostgreSQL journey | Playwright end-to-end test |

Use the cheapest layer that reliably proves the behavior. Avoid duplicating identical assertions at every layer.

## Unit-test rules

- Write unit tests alongside production changes.
- Test service business rules, validator schemas, hooks, components, and pure utilities directly.
- Use Arrange, Act, Assert structure and behavior-focused test names.
- Cover successful behavior and meaningful edge cases.
- Mock external or cross-boundary dependencies, not the function being tested.
- Prefer public interfaces and realistic inputs over private implementation details.
- Add a regression test for a bug fix whenever practical.

## Reliability rules

- Tests must be deterministic and independent of execution order.
- Control dates, random values, network calls, and database state when they affect repeatability.
- Use isolated database records and clean them up without deleting unrelated developer data.
- Do not rely on developer-specific environment state.
- Do not weaken assertions to hide broken behavior.

## Broader coverage

Add integration tests when behavior depends on routing, middleware, Prisma, transactions, or multiple modules working together. Add or update an end-to-end test for critical journeys crossing React, Express, and PostgreSQL.

The intended tools are Vitest and React Testing Library for the frontend, Vitest or Jest with Supertest for the backend, and Playwright for end-to-end tests.
