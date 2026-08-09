# Changelog

All notable user-facing and operational changes are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.2.0] - 2026-08-09

### Added

- Added a no-domain HTTPS production entry point through CloudFront for the complete EC2-hosted application.

### Changed

- Changed production proxy handling to preserve CloudFront's viewer protocol, issue secure session cookies, and present the HTTPS deployment without an insecure-connection warning.
- Changed automated deployment to use short-lived GitHub OIDC credentials and fail fast when SSH is unreachable.

### Security

- Restricted direct EC2 HTTP ingress to AWS's managed CloudFront origin-facing network.
- Restricted deployment SSH ingress to the active GitHub runner's IPv4 address and remove it after every deployment attempt.

## [3.1.1] - 2026-08-09

### Fixed

- Restored the same-origin EC2 Compose deployment for the frontend and API, preventing GitHub Pages from blocking authenticated session requests to the HTTP backend.

## [3.1.0] - 2026-08-09

### Added

- Added automated GitHub Pages publication of the repository-scoped frontend on every verified push to `master`.

### Changed

- Changed the static Pages build to use refresh-safe hash routing and a separately configured production API URL.

## [3.0.0] - 2026-08-09

### Added

- Added authenticated, case-insensitive application search with combinable status, source, and inclusive applied-date filters.
- Added server-side sorting and pagination with URL-persistent Chakra UI controls, clearable no-result states, and page-size selection.
- Added an application status board with all eight pipeline stages, per-column counts, drag-and-drop movement, and an accessible status selector.
- Added immediate board updates that restore a card to its previous column when saving fails, while successful status moves continue to record timeline events atomically.
- Added a private dashboard with current status totals, applications created since Monday, and screening, interview, and offer progression rates with clear denominators.
- Added automatic dashboard refreshes after applications are created, updated, moved, or deleted.
- Added user-owned follow-up and deadline reminders that can be created, completed, reopened, or deleted from application details.
- Added overdue and upcoming reminder groups on the dashboard with direct application links and quick completion actions.
- Added automatic dashboard follow-up suggestions for applied applications inactive for more than seven days, with one-action reminder creation due the next day.
- Added persistent light and dark themes with device-preference detection, accessible controls before and after sign-in, and a contrast-aware purple and plum visual system.
- Added private, reusable resume versions with editable positioning notes and optional application associations that are safely cleared when a version is deleted.
- Added private resume outcome comparisons with submitted application counts and clearly denominated screening, interview, and offer rates, including explicit zero-data states.
- Added private source outcome comparisons with normalized source names, submitted application counts, and clearly denominated response, interview, and offer rates.
- Added private manual Gmail synchronization with separate metadata-only OAuth consent, encrypted server-side credentials, incremental history cursors, provider-ID deduplication, expired-cursor recovery, and optional deployment configuration.
- Added responsive phone, tablet, and desktop layouts with compact mobile navigation, adaptive forms and actions, responsive dialogs, and contained scrolling for wide data views.

### Fixed

- Fixed board dragging so the complete application card follows the pointer instead of a small company-name preview.
- Fixed release verification so backend tests receive their required isolated database configuration in GitHub Actions.

## [2.1.0] - 2026-08-07

### Added

- Added an application timeline with dated manual notes, newest-first history, and authenticated ownership controls.
- Added automatic status-change events that store the previous and new statuses in the same database transaction as the application update.
- Added categorized changelog entries as the source for GitHub Release notes.

[Unreleased]: https://github.com/Kabilesh020799/JobApplicationTracker/compare/v3.2.0...HEAD
[3.2.0]: https://github.com/Kabilesh020799/JobApplicationTracker/compare/v3.1.1...v3.2.0
[3.1.1]: https://github.com/Kabilesh020799/JobApplicationTracker/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/Kabilesh020799/JobApplicationTracker/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/Kabilesh020799/JobApplicationTracker/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/Kabilesh020799/JobApplicationTracker/compare/v2.0.0...v2.1.0
