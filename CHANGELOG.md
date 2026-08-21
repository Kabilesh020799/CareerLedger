# Changelog

All notable user-facing and operational changes are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.29.3] - 2026-08-21

### Changed

- Rebrand the application, browser extension, backup and calendar downloads, API metadata, and deployment references as CareerLedger.

## [3.29.2] - 2026-08-21

### Fixed

- Speed up Gmail synchronization with larger bounded classification batches, more concurrent provider requests, timeouts that release the worker when Gmail stalls, and prompt manual failure handling while preserving fail-closed validation.

## [3.29.1] - 2026-08-18

### Fixed

- Speed up Gmail synchronization by fetching message metadata with bounded parallelism and sending only likely recruitment messages to the optional LLM fallback.

## [3.29.0] - 2026-08-17

### Added

- Add optional Sentry monitoring for frontend errors, performance traces, and privacy-conscious session replay, configurable for local Docker builds and production releases.

### Fixed

- Preserve company and role suggestions when Gmail subjects are generic by extracting job titles from message snippets and validated optional LLM output.
- Reduce optional OpenAI usage by applying deterministic Gmail rules first, batching only ambiguous messages with bounded metadata and output, and retaining strict indexed confidence validation.
- Use the lower-cost `gpt-5-nano` model by default for production's optional Gmail classification while preserving the model override setting.

## [3.28.1] - 2026-08-17

### Fixed

- Run manual Gmail synchronization through the background worker, report progress with short status requests, and classify ambiguous messages with bounded concurrency so optional OpenAI latency no longer causes CloudFront gateway timeouts.

## [3.28.0] - 2026-08-17

### Added

- Added private PDF, DOC, and DOCX cover-letter attachments to application creation and editing, with generated role-and-company filenames, protected downloads, and reliable replacement and deletion cleanup.

### Fixed

- Recognize company-only Gmail acknowledgement subjects such as “Thanks for your interest in Accenture,” while preserving explicit rejection wording and re-evaluating previously missed messages on the next synchronization.

## [3.27.5] - 2026-08-15

### Changed

- Refined light and dark themes with a calm indigo action accent, cooler slate surfaces, clearer focus indicators, and distinct semantic application-status colors.

## [3.27.4] - 2026-08-15

### Changed

- Streamlined workspace navigation, prioritized dashboard actions, applied application filters automatically, reduced duplicate detail actions, and progressively disclosed optional form content.
- Reworked team and data settings into consistent guided workflows, including review-before-import for portable backups.
- Collapsed secondary navigation groups, replaced board status fields with focused move menus, and brought headline dashboard metrics back into the first view.

### Fixed

- Replaced the mismatched native backup file input with a responsive, accessible picker that clearly shows the selected JSON filename.
- Prevented long application content from clipping mobile status information or causing horizontal page drift, completed the mobile board tab and navigation accessibility behavior, and kept mobile filters open while results are refined.
- Prevented invalid live filters from changing results, contained keyboard focus and page scrolling in the mobile menu, matched board loading placeholders to the final layout, and validated backup structure before import.
- Isolated local browser tests from the development database, generated ephemeral test credentials, and connected them to local Redis so interrupted verification runs no longer pollute a user's application list or stall repeated sign-ins.

## [3.27.3] - 2026-08-15

### Security

- Removed repository-defined demo credentials, moved optional demo identities to protected runtime configuration, and invalidated the previously published demo passwords during database migration.

## [3.27.2] - 2026-08-15

### Security

- Reserved administrator emails can no longer create accounts through public password signup or first-time Google authentication, while externally provisioned administrators can continue signing in.

## [3.27.1] - 2026-08-15

### Changed

- The first built-in demo account is the default administrator when no administrator email list is configured; an explicit list replaces the demo default.

### Security

- Documented that the default administrator uses public demo credentials and must not be used with private production account data.

## [3.27.0] - 2026-08-15

### Added

- Added an administrator-only user dashboard with account totals, search, pagination, verification and authentication details, and high-level usage counts while excluding credentials and private user content.

## [3.26.0] - 2026-08-14

### Added

- Added a fail-closed account email allowlist for the optional OpenAI Gmail classifier, with deployment support for selecting authorized accounts without exposing or persisting the API key.

## [3.25.0] - 2026-08-14

### Added

- Added privacy-safe API and database duration headers so slow application requests can be measured without restoring logging or retaining request details.

### Changed

- Application boards and choosers now load large collections through bounded pages of 50, while PostgreSQL uses pagination-aware and trigram indexes for application discovery.

### Fixed

- Removed per-application duplicate lookups during workspace imports and per-resume cleanup writes during account deletion.

## [3.24.4] - 2026-08-13

### Fixed

- Republished the logging-free production build, made legacy SSH releases fall back to Systems Manager when available, and remove obsolete services and unused images before pulling replacements so they cannot exhaust a small host during deployment.

## [3.24.3] - 2026-08-13

### Fixed

- Removed the logging and metrics packages, endpoints, middleware, tests, dashboards, exporters, and production monitoring configuration so the application remains responsive on its current host.

## [3.24.0] - 2026-08-13

### Added

- Added privacy-safe structured production logging and a private Prometheus/Grafana monitoring stack with request and worker correlation, RED metrics, queue and Gmail failure visibility, PostgreSQL, Redis, Nginx, host and container dashboards, and sustained actionable alerts.

## [3.23.1] - 2026-08-12

### Fixed

- Reduced release latency by splitting critical browser coverage across two isolated jobs and using a pinned runner image with Chromium preinstalled.

## [3.23.0] - 2026-08-12

### Added

- Streamlined the dashboard around headline metrics, a compact action panel, pipeline conversion, and tabbed source or resume-tag insights with a prominent application action.

### Fixed

- Restored the application choices in the calendar-item dialog and now distinguish loading or request failures from choosing no linked application.
- Kept critical browser coverage aligned with the dashboard's tabbed performance insights on desktop and mobile.

## [3.22.0] - 2026-08-12

### Added

- Added date-driven creation of persistent tasks, events, and reminders directly from the responsive calendar, with optional authorized application links and calendar-feed inclusion.

### Fixed

- Reduced release verification time by running backend, frontend, critical browser, release-metadata, and deployment-automation checks as independent parallel jobs while retaining the complete release gate.
- Prevented the dependency-free release-metadata job from requesting an npm cache when the monorepo has no root lockfile.

## [3.21.0] - 2026-08-12

### Added

- Added a responsive month calendar for browsing application deadlines and interview milestones and opening their related applications.

## [3.20.0] - 2026-08-12

### Added

- Added expiring email verification and password recovery, self-service profiles, session-revoking password reset, and confirmed account deletion.
- Added personal and team workspaces with role-based membership, secure invitations, shared application access, and workspace switching.
- Added privacy-filtered workspace JSON export and transactional import with duplicate reporting.
- Added downloadable iCalendar snapshots and revocable private calendar subscription feeds for deadlines and interview milestones.

### Security

- Store only hashes of recovery, verification, invitation, and calendar bearer tokens, and queue private resume cleanup before account deletion.

## [3.19.0] - 2026-08-12

### Added

- Added an optional, validated LLM fallback for ambiguous Gmail recruitment updates while preserving deterministic classification and uninterrupted synchronization when OpenAI is unavailable or not configured.

## [3.18.2] - 2026-08-11

### Fixed

- Stabilized critical browser verification when Chakra dropdown options remount during their opening transition.

## [3.18.1] - 2026-08-11

### Fixed

- Kept application-status badges compact and consistently aligned on application details and other status views.

## [3.18.0] - 2026-08-11

### Added

- Added résumé-tag selection and private résumé uploads when creating an application from a Gmail review.

## [3.17.0] - 2026-08-11

### Added

- Added rate-limited password account signup with unique username and email validation, strong password requirements, immediate authenticated sessions, and a responsive signup interface.

### Fixed

- Detected “Thanks for applying to Company” Gmail subjects as application acknowledgements and re-evaluated previously synchronized messages with the improved classifier.

## [3.16.1] - 2026-08-11

### Fixed

- Detected personalized “Thanks for your interest in Company, Name” Gmail subjects as rejection updates and re-evaluated older unmatched messages once, while leaving generic interest messages unclassified.

## [3.16.0] - 2026-08-10

### Added

- Added a second automatically provisioned demo account with isolated user-owned data.

### Changed

- Replaced browser-native application dropdowns with accessible Chakra popup menus and custom selected-state indicators.

### Fixed

- Prevented successful password sign-ins from exhausting the shared network login limit while retaining protection against failed attempts.
- Kept custom application dropdown triggers accessibly labelled and aligned browser tests with their visible popup controls.

## [3.15.2] - 2026-08-10

### Fixed

- Aligned application-filter and application-form dropdown chevrons consistently with their selected values.

### Security

- Protected password login with Redis-backed progressive delays, temporary account and network limits, uniform credential failures, and sanitized audit events.

## [3.15.1] - 2026-08-10

### Fixed

- Gave the light-theme control enough room in the account-action row so its icon and label remain comfortably readable.

## [3.15.0] - 2026-08-10

### Added

- Added application-detail quick actions for status changes, notes, reminders, and editing, with accessible confirmation messages for important completed actions.
- Added guided browser-extension token copying, accessible notification switches, and consistent interface icons.

### Changed

- Reorganized the dashboard so overdue, upcoming, and inactive application work appears before analytics, with a more focused metric summary.
- Replaced the phone board's eight-column canvas with status tabs and a single readable application list while preserving the desktop drag-and-drop board.
- Simplified application discovery around search, status, and sorting with progressively disclosed advanced filters.
- Separated uploaded résumé documents and strategy tags into focused tabs, and added explicit form cancellation actions.
- Split frontend routes into page-level bundles for faster initial loading and consistent page-shaped loading feedback.

## [3.14.0] - 2026-08-10

### Added

- Restored résumé strategy management as lightweight tags with Backend, Frontend, Full-stack, and General suggestions plus custom tag creation.

### Changed

- Kept uploaded résumé documents in a separate private preview library while using résumé tags for application assignment and outcome analytics.
- Removed notes from the résumé tag interface and clarified tag terminology across forms, application details, dashboard analytics, documentation, and API descriptions.

## [3.13.0] - 2026-08-10

### Added

- Added a private in-application portal for previewing uploaded PDF résumés, with loading and failure states plus a new-tab fallback for other document formats.

### Changed

- Removed the metadata-only “Add resume version” block from the résumé document library so uploaded documents remain the primary workflow.

## [3.12.2] - 2026-08-10

### Changed

- Redesigned the application workspace with a calmer neutral-and-purple color system, grouped icon navigation, clearer page hierarchy, compact dashboard metrics, guided automation settings, and a focused sign-in experience.
- Replaced the phone application table with accessible application cards, added persistent mobile workflow shortcuts and collapsible filters, and reorganized application forms and details for faster scanning and completion.

### Fixed

- Replaced blank loading screens with page-shaped skeletons, improved unavailable notification and email-sync states, preserved keyboard focus and reduced-motion behavior, and prevented the login theme control from being obscured.

## [3.12.1] - 2026-08-10

### Fixed

- Kept the sign-out and theme controls aligned when the dark theme changes the toggle label to “Light theme.”

## [3.12.0] - 2026-08-10

### Added

- Added editable browser extraction and persistent application details for skills, experience requirements, salary range and period, multiple locations, and remote, hybrid, or on-site work mode.
- Added opt-in email and browser push delivery for due application reminders, including user-scoped settings, successful-delivery deduplication, expired subscription cleanup, and retryable background processing.

## [3.11.0] - 2026-08-10

### Added

- Added a one-command, review-first production provisioner that creates an isolated AWS network, EC2 host, encrypted storage, private resume bucket, CloudFront and WAF protection, installs Docker, starts the complete Compose stack, configures GitHub deployment variables, and verifies public HTTPS health.

### Changed

- Changed greenfield deployments to use AWS Systems Manager instead of SSH, with short-lived GHCR and application configuration passed through encrypted Parameter Store values and deleted after deployment.

## [3.10.0] - 2026-08-10

### Added

- Added review-first Terraform adoption for the existing AWS production stack, including protected EC2, Elastic IP, CloudFront and WAF, private S3 storage, IAM roles, GitHub OIDC, and encrypted versioned remote state with native locking.

## [3.9.2] - 2026-08-10

### Changed

- Refined the browser extension into a cleaner light/dark review interface with collapsible connection setup, clearer required fields and feedback, and an option to read the current page again.

## [3.9.1] - 2026-08-10

### Fixed

- Fixed Gmail detection for common acknowledgements such as “Thank you for your application to Pigmen” and prevented acknowledgement wording from being suggested as a job title.

## [3.9.0] - 2026-08-10

### Added

- Added a Manifest V3 browser extension that proposes company, role, location, source URL, and description from the active job posting, requires editable review, and saves a durable application snapshot only after confirmation.
- Added expiring, revocable, capture-only extension access tokens whose complete secrets are displayed once and stored only as hashes, plus an authenticated web page for token management.

## [3.8.0] - 2026-08-10

### Added

- Added complete interactive Swagger documentation for the authenticated application, resume, timeline, reminder, dashboard, and Gmail APIs, including endpoint purposes, inputs, authentication, and response meanings.
- Added maintained architecture, database, security, troubleshooting, and API references for contributors and operators.
- Added user-configurable automatic Gmail synchronization with a persistent Redis queue, separate BullMQ worker, incremental history processing, deduplication, exponential retries, restart reconciliation, and visible failure status.

### Changed

- Changed the feature completion workflow to review and update every affected project document before requesting approval to release.

## [3.7.0] - 2026-08-10

### Added

- Added a user-scoped uploaded-resume library on the Resumes page, showing each document's filename, application, size, upload date, and private view link.
- Added an authenticated API endpoint for listing the current user's uploaded resume attachments.

## [3.6.0] - 2026-08-09

### Added

- Added direct resume uploads to private S3 storage using short-lived, user-scoped permissions and the EC2 instance role, with authenticated signed downloads and no permanent AWS credentials in the browser or deployment environment.
- Added idempotent migration of existing PostgreSQL-backed resume files into S3 and durable cleanup for replaced or deleted objects.

### Fixed

- Fixed the production proxy upload limit so the documented 5 MB resume size is accepted and oversized multipart uploads receive a JSON error.

## [3.5.0] - 2026-08-09

### Added

- Added resume upload and replacement to the application edit workflow, preserving the current document when no new file is selected and regenerating the `Role_Company` filename for replacements.

## [3.4.0] - 2026-08-09

### Added

- Added private PDF, DOC, and DOCX resume attachments during application creation, with validated 5 MB uploads stored in PostgreSQL, automatic `Role_Company` filenames, and authenticated downloads from application details.
- Added a pending-update badge to the Gmail navigation tab that counts matched status suggestions and proposed new applications.

## [3.3.0] - 2026-08-09

### Added

- Added a private Gmail recruitment-update review queue with deterministic status detection, owned-application matching, editable confirmation, ignore decisions, and confirmed new-application suggestions.

### Changed

- Changed manual Gmail synchronization to analyze new and previously stored message references once, retain only review-required subjects and senders for detected updates, and keep message bodies and transient snippets out of PostgreSQL.

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

[Unreleased]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.29.2...HEAD
[3.29.3]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.29.2...v3.29.3
[3.29.2]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.29.1...v3.29.2
[3.29.1]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.29.0...v3.29.1
[3.29.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.28.1...v3.29.0
[3.28.1]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.28.0...v3.28.1
[3.28.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.27.5...v3.28.0
[3.27.5]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.27.4...v3.27.5
[3.27.4]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.27.3...v3.27.4
[3.27.3]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.27.2...v3.27.3
[3.27.2]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.27.1...v3.27.2
[3.27.1]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.27.0...v3.27.1
[3.27.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.26.0...v3.27.0
[3.26.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.25.0...v3.26.0
[3.25.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.24.4...v3.25.0
[3.24.4]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.24.0...v3.24.4
[3.24.3]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.24.0...v3.24.3
[3.24.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.23.1...v3.24.0
[3.23.1]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.23.0...v3.23.1
[3.23.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.22.0...v3.23.0
[3.22.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.21.0...v3.22.0
[3.21.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.20.0...v3.21.0
[3.20.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.19.0...v3.20.0
[3.19.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.18.2...v3.19.0
[3.18.2]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.18.1...v3.18.2
[3.18.1]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.18.0...v3.18.1
[3.18.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.17.0...v3.18.0
[3.17.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.16.1...v3.17.0
[3.16.1]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.16.0...v3.16.1
[3.16.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.15.2...v3.16.0
[3.15.2]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.15.1...v3.15.2
[3.15.1]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.15.0...v3.15.1
[3.15.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.14.0...v3.15.0
[3.14.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.13.0...v3.14.0
[3.13.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.12.2...v3.13.0
[3.12.2]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.12.1...v3.12.2
[3.12.1]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.12.0...v3.12.1
[3.12.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.11.0...v3.12.0
[3.11.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.10.0...v3.11.0
[3.10.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.9.2...v3.10.0
[3.9.2]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.9.1...v3.9.2
[3.9.1]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.9.0...v3.9.1
[3.9.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.8.0...v3.9.0
[3.8.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.7.0...v3.8.0
[3.7.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.6.0...v3.7.0
[3.6.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.5.0...v3.6.0
[3.5.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.4.0...v3.5.0
[3.4.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.1.1...v3.2.0
[3.1.1]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/Kabilesh020799/CareerLedger/compare/v2.0.0...v2.1.0
