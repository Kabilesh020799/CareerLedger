---
name: update-project-documentation
description: Review and update all CareerLedger documentation affected by a completed feature, bug fix, API change, schema change, configuration change, or deployment change. Use before release classification and before requesting approval to commit or push.
---

# Update Project Documentation

Keep documentation aligned with implemented behavior. Read [the documentation checklist](references/documentation-checklist.md), identify affected documents, and update each applicable item. Do not claim roadmap behavior is available.

## Workflow

1. Compare the completed change with its Gherkin behavior, API contract, database schema, configuration, deployment, security, and user-facing workflow.
2. Apply every relevant item in the checklist. “No update required” is valid only after reviewing that document's trigger.
3. Keep Swagger route JSDoc, shared OpenAPI schemas, and actual validators/controllers consistent for API changes.
4. Document exported frontend interfaces and non-obvious behavior with concise JSDoc; do not comment trivial local variables.
5. Check links, commands, environment names, ports, and examples against the repository.
6. Include the documentation review result in the pre-push change report.
