# Browser extension

The Manifest V3 extension in `extension/` proposes company, job title, location, source URL, and description from the active job-posting tab. Nothing is saved until the user reviews and confirms the editable form.

## Install locally

1. Open Job Tracker and visit **Extension**.
2. Create a named extension token and copy the complete value immediately.
3. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the repository's `extension` directory.
4. Open the extension, enter the Job Tracker API URL and the one-time token, then save settings.
5. Visit a job posting, open the extension, review every proposed field, and choose **Save application**.

After a connection is saved, setup stays collapsed so the popup opens directly into posting review. Use **Read page again** after changing tabs or when a site finishes loading late. The popup follows the browser's light or dark color preference and reports loading, validation, save, and extraction results without closing the review form.

For local Docker, use `http://localhost:3000/api`. The included manifest also permits the current production CloudFront origin. A deployment on another host must add that origin to `host_permissions` before packaging the extension.

## Extraction behavior

The content script first looks for Schema.org `JobPosting` JSON-LD, then common semantic page fields and headings. Publisher markup varies, so extracted values are proposals rather than trusted data. The user must supply any missing required field and can correct all values.

Confirmed captures create a `SAVED` application with source `Browser extension`, the original URL, a description snapshot, and the server capture timestamp. Structured skills, salary, experience, and work-mode extraction remain roadmap work.

## Security

The web application creates a random 90-day capture token and displays it once. PostgreSQL stores only its SHA-256 hash and a non-secret prefix. The extension keeps the token in extension-local storage and never injects it into the viewed page. Tokens can create captured applications only; they cannot read, edit, or delete existing data. Revoke lost or unused tokens from the Extension page.
