---
name: commit-and-push-changes
description: Verify and prepare completed Job Application Tracker features and bug fixes with informative Conventional Commit messages and matching release metadata. Use after implementation and definition-of-done checks succeed; always report the changes and request explicit user approval before committing or pushing.
---

# Prepare Changes for Approval

Prepare completed work without mixing unrelated changes or weakening repository safeguards. Do not commit or push until the user explicitly approves.

## Workflow

1. Confirm the feature or fix satisfies `docs/standards/definition-of-done.md`. Do not commit incomplete work or work with failing required checks.
2. Read `../update-project-documentation/SKILL.md` completely and apply it before release classification.
3. Read `../update-release-version/SKILL.md` completely and apply it before committing application or operational changes. Never reuse a published version.
4. Inspect the current branch, upstream, remote, `git status`, staged and unstaged diffs, and untracked files. Preserve unrelated user changes and stage only files belonging to the completed task.
5. Check for `.env` files, private keys, credentials, tokens, database dumps, uploaded personal documents, or other secrets. Never stage or print sensitive content.
6. Run the relevant tests, type checks, lint checks, builds, migrations, runtime checks, and release checks required by the affected surface. Run `git diff --check` before staging.
7. Read [the commit-message policy](references/commit-message-policy.md). Draft a Conventional Commit subject and a body that explains the delivered behavior, important safety or persistence semantics, and planned release version.
8. Stage explicit task paths. Review `git diff --cached --name-status`, `git diff --cached --stat`, and `git diff --cached --check` before committing. Do not use broad staging when unrelated changes exist.
9. Stop and report the changed files, user-visible behavior, documentation review, checks run, release classification/version, proposed Conventional Commit subject, and whether a push would trigger a release workflow. Ask the user for explicit approval.
10. Only after explicit approval, create one coherent commit. Do not bypass hooks, amend commits owned by someone else, or commit generated noise that the repository does not track.
11. After approval, push the current branch to its configured `origin` branch with a normal, non-force push. Never create or push tags; the release workflow owns tags and GitHub Releases.
12. Confirm the worktree state and, when GitHub CLI is available, confirm the new workflow run. Report the commit SHA, subject, branch, push result, checks, release version, and workflow URL.

## Stop conditions

- If verification fails, leave the changes uncommitted and report the failing check.
- If task-owned changes cannot be separated safely from unrelated work, stop and explain the overlap.
- If the upstream rejects the push, do not force, reset, pull, or rebase automatically. Report the non-fast-forward or permission failure.
- If a commit succeeds but pushing fails, preserve the local commit and report how it can be retried.
- An explicit user instruction not to commit or push overrides this skill.
- “Build”, “implement”, or “finish” does not imply approval to commit or push. Treat only a clear confirmation such as “ok, push it” as approval.
