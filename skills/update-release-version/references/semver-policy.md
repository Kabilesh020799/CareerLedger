# Project semantic-version policy

Classify the combined user-visible and operational effect of all unreleased changes. When categories differ, select the highest level: `major` over `minor`, and `minor` over `patch`.

## Major

Increment `MAJOR` for a backward-incompatible contract or product change, including:

- removing or incompatibly changing an API endpoint, accepted input, or response;
- removing or renaming persisted fields or status values;
- destructive data changes that require coordinated migration or discard supported data;
- changing required configuration or deployment behavior in a way existing installations cannot adopt without intervention.

Example: `1.4.2` becomes `2.0.0`.

## Minor

Increment `MINOR` for a backward-compatible capability, including:

- a new usable product feature or workflow;
- a new API endpoint or optional response/input field;
- a new backward-compatible database model or relationship;
- a meaningful new operational capability that users or operators can opt into.

Example: `1.4.2` becomes `1.5.0`.

## Patch

Increment `PATCH` for a backward-compatible correction, including:

- a user-visible bug, validation, accessibility, security, or performance fix;
- a dependency correction needed by the shipped application;
- a CI, container, migration, or deployment fix required to build or run the existing release behavior reliably.

Example: `1.4.2` becomes `1.4.3`.

## No release bump

Use `none` when changes do not alter the shipped application or its required operation, including:

- documentation or comments only;
- tests only, without a product fix;
- Gherkin wording that only clarifies existing behavior;
- coding-agent instructions or skills;
- formatting or repository housekeeping.

If maintenance accompanies a releasable change, classify the releasable change normally.

## Planned and published versions

- The root `package.json` is authoritative.
- A matching published GitHub Release means that version is immutable and the next releasable change must increment it.
- A root version with no matching release is planned. Accumulate changes into it and increase it only if their combined impact requires a higher level.
- Never lower a planned version or overwrite a published tag.
