# Changelog

All notable user-facing and operational changes are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2026-08-08

### Added

- Added authenticated, case-insensitive application search with combinable status, source, and inclusive applied-date filters.
- Added server-side sorting and pagination with URL-persistent Chakra UI controls, clearable no-result states, and page-size selection.

## [2.1.0] - 2026-08-07

### Added

- Added an application timeline with dated manual notes, newest-first history, and authenticated ownership controls.
- Added automatic status-change events that store the previous and new statuses in the same database transaction as the application update.
- Added categorized changelog entries as the source for GitHub Release notes.

[Unreleased]: https://github.com/Kabilesh020799/JobApplicationTracker/compare/v2.2.0...HEAD
[2.2.0]: https://github.com/Kabilesh020799/JobApplicationTracker/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/Kabilesh020799/JobApplicationTracker/compare/v2.0.0...v2.1.0
