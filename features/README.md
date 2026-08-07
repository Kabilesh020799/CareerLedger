# Behaviour specifications

This directory contains product-level Gherkin specifications because the behaviours cross the frontend, API, Prisma, and PostgreSQL boundaries.

- `v0.1/` contains the current release scope and should be automated first.
- `roadmap/` documents explicitly planned behaviour that is not implemented yet.

Feature files describe observable behaviour and intentionally avoid selectors, database implementation details, and test-framework-specific steps. When test automation is introduced, shared step definitions should live in the chosen test package rather than beside production code.
