# Feature specification standard

Gherkin specifications are part of feature development, not optional follow-up documentation.

## Location

- Put current, authorized behavior in `features/v0.1`.
- Put planned but unselected behavior in `features/roadmap`.
- Create a focused `<capability>.feature` file when no existing feature owns the behavior.
- Do not combine unrelated capabilities into one large feature file.

## Workflow

Before changing production code:

1. Find the feature file that owns the requested behavior.
2. Add or update its scenarios.
3. Confirm the scenarios cover the selected scope without pulling in roadmap work.
4. Use the scenarios to guide implementation and testing.

When observable behavior changes during implementation, update the scenarios in the same change.

## Writing rules

- Describe externally observable behavior in domain language.
- Avoid CSS selectors, component names, function names, Prisma calls, and other implementation details.
- Give each scenario one clear purpose and outcome.
- Include the main success path and relevant validation, missing-resource, empty, permission, and failure paths.
- Use `Background` only when every scenario shares the same context.
- Use `Scenario Outline` for meaningful input variations.
- Keep scenarios deterministic and independent of execution order.
- Use tags such as `@v0.1`, `@roadmap`, `@api`, and `@ui` to identify scope.
- Never weaken a scenario merely to make an implementation pass.

## Automation

Automate each scenario at the lowest reliable test layer. A scenario does not automatically require a browser test. When its relationship to an automated test is unclear, include the feature and scenario name in the test description or a short comment.

See [testing.md](testing.md) for test-layer selection and quality rules.
