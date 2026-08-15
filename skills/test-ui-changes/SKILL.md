---
name: test-ui-changes
description: Require and verify both frontend unit tests and Playwright end-to-end tests for every Job Application Tracker UI change. Use whenever React components, pages, layouts, styles, visible copy, navigation, forms, loading or error states, responsive behavior, or other user-visible frontend behavior is added, removed, fixed, or modified.
---

# Test UI Changes

Treat unit and end-to-end coverage as part of every UI implementation, including visual-only changes and bug fixes. Do not finish a UI change with only one test layer.

## Workflow

1. Read `docs/standards/testing.md`, the relevant Gherkin scenarios, the changed UI, and nearby tests before editing.
2. Identify the user-visible contract and the component-level logic affected by the change.
3. Add or update a colocated Vitest and Testing Library test under `frontend/src`. Exercise behavior through accessible roles, labels, and user interactions. Cover relevant success, validation, loading, empty, and error states without asserting implementation details.
4. Add or update a Playwright test under `frontend/e2e`. Exercise the changed behavior through the real browser workflow and assert the user-visible outcome. Include responsive coverage when layout or breakpoint behavior changes.
5. Keep tests deterministic and independent. Reuse existing Playwright support utilities, create isolated test data where required, and do not weaken an assertion merely to make a test pass.
6. Run the focused unit test and focused Playwright spec while iterating, then run the complete frontend unit suite and end-to-end suite before finalizing:

   ```bash
   cd frontend && npm test
   cd frontend && npm run test:e2e
   ```

7. Also run the repository-required frontend lint and build checks. Report any unavailable or failing check explicitly; do not describe the UI change as complete while either required test layer is missing or failing.

## Coverage rule

For every UI change, the delivered diff must contain meaningful unit-test coverage and meaningful end-to-end coverage for the changed contract. Existing tests count only when they are updated as needed to assert the new or changed outcome. Snapshot churn, placeholder assertions, and tests that merely confirm the page renders do not satisfy this rule.
