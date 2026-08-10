# Commit message policy

Use an informative Conventional Commit for every completed feature or bug fix.

## Subject

Format the subject as `<type>(<optional-scope>): <outcome>`.

- Use `feat` for a new user or operator capability.
- Use `fix` for a backward-compatible correction.
- Use `security` for a security-specific fix when that distinction helps operators.
- Use `perf` for a measurable performance correction.
- Keep it imperative, behavior-focused, lowercase after the colon, and no longer than 72 characters.
- Describe the outcome, not the edited files or implementation activity.

## Body

Include a concise body for features and fixes:

- State the user-visible or operational result.
- State important validation, privacy, authorization, transaction, migration, or persistence behavior when relevant.
- Mention the matching planned release as `Release: vMAJOR.MINOR.PATCH` when the change is releasable.

Do not list every file, duplicate the changelog verbatim, expose secrets, or include vague text such as “updates” or “changes.”

## Examples

```text
feat(applications): support resume replacement on edit

- Let users replace a private resume attachment from the edit form.
- Preserve the existing document when no replacement is selected.
- Validate and store the replacement atomically with the application update.

Release: v3.5.0
```

```text
fix(deploy): remove temporary SSH ingress reliably

- Revoke the active runner's security-group rule even when deployment fails.
- Keep existing application containers and PostgreSQL data unchanged.

Release: v3.2.1
```
