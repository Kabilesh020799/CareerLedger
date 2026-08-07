---
name: update-release-version
description: Classify completed Job Application Tracker changes under Semantic Versioning and update the root package.json release version when needed. Use after implementing a feature, compatible fix, security or deployment fix, breaking API or product change, or when preparing a release; also use at task completion to determine when documentation, tests, or agent-only maintenance requires no version bump.
---

# Update Release Version

Use the root `package.json` as the only release-version source. Read [the project SemVer policy](references/semver-policy.md) completely before classifying changes.

## Workflow

1. Inspect `git status`, the latest `v*` tag, and all changes since that tag. Include staged, unstaged, and untracked work that belongs to the task.
2. Determine whether the root version is already released. If it is unreleased, treat it as the planned version and raise it only when the combined changes require a higher SemVer level.
3. Classify the complete release by its highest-impact change: `major` for incompatibility, `minor` for a backward-compatible feature, `patch` for a backward-compatible fix, or `none` for repository-only maintenance.
4. State the classification and the concrete behavior that justifies it. Ask the user only when product compatibility is genuinely ambiguous.
5. For `major`, `minor`, or `patch`, edit only the root `package.json` version. Reset lower-order numbers according to SemVer. Do not change `backend/package.json` or `frontend/package.json`.
6. Do not create, move, or delete Git tags or GitHub Releases. The push workflow owns those operations.
7. Run `npm run test:release` and `npm run release:version`. For a bumped version, confirm the resulting `vMAJOR.MINOR.PATCH` tag is not already published before recommending a push. For `none`, confirm the unchanged version is intentional and will make the release workflow stop after verification.
8. Report the old version, new version, classification, and verification result. For `none`, explicitly report that the version was intentionally unchanged.

Never bump a version merely because another commit was added before the planned version was released. Never reuse a published version for different application code.
