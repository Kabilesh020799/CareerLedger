---
name: update-release-version
description: Classify completed Job Application Tracker changes under Semantic Versioning, update the root version, and maintain categorized GitHub Release changelog entries. Use after implementing a feature, compatible fix, security or deployment fix, breaking change, or when preparing a release; also use at task completion to determine whether maintenance requires no release entry or version bump.
---

# Update Release Version

Use the root `package.json` as the only release-version source and `CHANGELOG.md` as the GitHub Release-note source. Read [the project SemVer policy](references/semver-policy.md) and [the changelog policy](references/changelog-policy.md) completely before classifying changes.

## Workflow

1. Inspect `git status`, the latest `v*` tag, `CHANGELOG.md`, and all changes since the tag. Include staged, unstaged, and untracked work that belongs to the task.
2. Determine whether the root version is already released. If it is unreleased, treat it as the planned version and raise it only when the combined changes require a higher SemVer level.
3. Classify the complete release by its highest-impact change: `major` for incompatibility, `minor` for a backward-compatible feature, `patch` for a backward-compatible fix, or `none` for repository-only maintenance.
4. State the classification and the concrete behavior that justifies it. Ask the user only when product compatibility is genuinely ambiguous.
5. For `major`, `minor`, or `patch`, edit only the root `package.json` version. Reset lower-order numbers according to SemVer. Do not change `backend/package.json` or `frontend/package.json`.
6. Add concise user-facing entries under the exact planned version in `CHANGELOG.md`. Append to an existing unpublished section; never rewrite a published section. For `none`, do not add a release entry.
7. Do not create, move, or delete Git tags or GitHub Releases. The push workflow owns those operations.
8. Run `npm run test:release`, `npm run release:version`, and `npm run release:notes`. For a bumped version, confirm the resulting `vMAJOR.MINOR.PATCH` tag is not already published before recommending a push. For `none`, confirm the unchanged version is intentional and will make the release workflow stop after verification.
9. Report the old version, new version, classification, changelog categories, and verification result. For `none`, explicitly report that the version and changelog were intentionally unchanged.

Never bump a version merely because another commit was added before the planned version was released. Never reuse a published version for different application code.
