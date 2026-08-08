# Definition of done

A feature is complete only when all applicable conditions are satisfied:

- Its Gherkin scenarios accurately describe the delivered behavior.
- New or changed logic has unit tests.
- The root `README.md` documents new or changed user-visible behavior and lists only implemented features.
- Releasable user-facing or operational changes have categorized entries in the planned version section of `CHANGELOG.md`.
- Required integration or end-to-end coverage is included.
- Success, validation, missing-resource, empty, and failure behavior is handled as relevant.
- Relevant tests, type checks, lint checks, and builds pass.
- Runtime behavior is exercised when infrastructure or database integration changes.
- Database changes include a reviewed and applied Prisma migration.
- Setup or environment documentation is updated when required.
- No secrets or sensitive data are committed or exposed in logs.
- No unrelated roadmap capability is introduced.
- Deferred scenarios remain clearly identified as roadmap work.

Do not report a feature as complete when only one layer of a required vertical slice has been implemented. Clearly state any skipped verification or known limitation.
