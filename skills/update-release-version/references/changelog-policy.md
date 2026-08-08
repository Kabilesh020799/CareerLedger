# Project changelog policy

`CHANGELOG.md` is the source for GitHub Release descriptions. The release workflow extracts the section matching the root `package.json` version and fails before image publishing when that section is missing or has no categorized bullet.

## Categories

Use only the relevant Keep a Changelog headings:

- `Added` for new user-facing or operational capabilities.
- `Changed` for compatible behavior changes.
- `Fixed` for corrected defects, deployment failures, regressions, or security weaknesses.
- `Security` when operators or users need a security-specific explanation.
- `Deprecated` or `Removed` when compatibility is changing.

## Entry rules

- Describe the outcome in plain user or operator language.
- Use one bullet per meaningful feature or fix.
- Combine implementation details that deliver one outcome.
- Do not list commits, file names, internal refactors, generated files, or routine test additions.
- Do not expose secrets, exploit details, or private infrastructure data.
- Documentation-only, test-only, formatting, and agent-guidance changes receive no release entry unless they change shipped operation.

## Version workflow

- Keep `## [Unreleased]` at the top for work not assigned to a version.
- At release classification, move applicable entries into `## [MAJOR.MINOR.PATCH] - YYYY-MM-DD` matching the root version.
- Append new work to an existing section when that version remains unpublished.
- If the required SemVer level raises an unpublished planned version, rename its section and comparison link with the package version.
- Never edit a version section after its GitHub Release or tag is published.
- Maintain comparison links at the bottom of the changelog for the planned version and `Unreleased`.
