import type { OpenAPIV3 } from "openapi-types";
import swaggerJSDoc from "swagger-jsdoc";

export const openApiDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Job Application Tracker API",
    version: process.env.APP_VERSION ?? "development",
    description:
      "The Job Application Tracker API helps authenticated users manage their job-search pipeline. Use it to create and update applications, attach and download resumes, review follow-up reminders, view dashboard analytics, and synchronize job-related Gmail messages. Application, resume, reminder, and Gmail records are private to the signed-in user.",
  },
  servers: [{ url: "/", description: "Current server" }],
  tags: [
    { name: "Health" },
    { name: "Authentication" },
    { name: "Applications" },
    { name: "Resumes" },
    { name: "Reminders" },
    { name: "Dashboard" },
    { name: "Gmail" },
    { name: "Browser Extension" },
    { name: "Notifications" },
  ],
  components: {
    securitySchemes: {
      sessionCookie: { type: "apiKey", in: "cookie", name: "job-tracker-session" },
      extensionToken: { type: "http", scheme: "bearer", bearerFormat: "Job Tracker extension token" },
    },
    schemas: {
      Application: {
        type: "object",
        required: ["id", "company", "jobTitle", "status", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" }, company: { type: "string" }, jobTitle: { type: "string" },
          location: { type: "string", nullable: true }, jobUrl: { type: "string", nullable: true },
          source: { type: "string", nullable: true }, notes: { type: "string", nullable: true },
          jobDescription: { type: "string", nullable: true }, capturedAt: { type: "string", format: "date-time", nullable: true },
          skills: { type: "array", items: { type: "string" } }, experienceRequirements: { type: "string", nullable: true },
          salaryMin: { type: "number", nullable: true }, salaryMax: { type: "number", nullable: true },
          salaryCurrency: { type: "string", nullable: true }, salaryPeriod: { type: "string", enum: ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"], nullable: true },
          workMode: { type: "string", enum: ["REMOTE", "HYBRID", "ONSITE"], nullable: true },
          status: { type: "string", enum: ["SAVED", "APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"] },
          appliedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
        },
      },
      ApplicationInput: {
        type: "object",
        required: ["company", "jobTitle"],
        properties: {
          company: { type: "string" }, jobTitle: { type: "string" },
          location: { type: "string", nullable: true }, jobUrl: { type: "string", format: "uri", nullable: true },
          source: { type: "string", nullable: true }, notes: { type: "string", nullable: true },
          status: { $ref: "#/components/schemas/ApplicationStatus" }, appliedAt: { type: "string", format: "date-time", nullable: true },
          resumeVersionId: { type: "string", nullable: true }, resumeUploadKey: { type: "string" },
        },
      },
      ApplicationStatus: { type: "string", enum: ["SAVED", "APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"] },
      ApplicationEvent: { type: "object", properties: { id: { type: "string" }, type: { type: "string", enum: ["NOTE", "STATUS_CHANGE"] }, description: { type: "string" }, fromStatus: { $ref: "#/components/schemas/ApplicationStatus" }, toStatus: { $ref: "#/components/schemas/ApplicationStatus" }, occurredAt: { type: "string", format: "date-time" } } },
      Reminder: { type: "object", properties: { id: { type: "string" }, applicationId: { type: "string" }, type: { type: "string", enum: ["FOLLOW_UP", "DEADLINE"] }, description: { type: "string" }, dueAt: { type: "string", format: "date-time" }, completedAt: { type: "string", format: "date-time", nullable: true } } },
      ResumeVersion: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, notes: { type: "string", nullable: true }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } },
      GmailStatus: { type: "object", required: ["configured", "connected", "synchronizedMessages", "automaticSync"], properties: { configured: { type: "boolean" }, connected: { type: "boolean" }, gmailEmail: { type: "string", nullable: true }, lastSyncedAt: { type: "string", format: "date-time", nullable: true }, synchronizedMessages: { type: "integer" }, automaticSync: { type: "object", required: ["enabled", "intervalMinutes"], properties: { enabled: { type: "boolean" }, intervalMinutes: { type: "integer", enum: [15, 30, 60, 180, 360, 720, 1440] }, lastAttemptAt: { type: "string", format: "date-time", nullable: true }, lastError: { type: "string", nullable: true } } } } },
      NotificationSettings: { type: "object", required: ["emailEnabled", "browserPushEnabled", "emailAvailable", "browserPushAvailable", "browserSubscribed"], properties: { emailEnabled: { type: "boolean" }, browserPushEnabled: { type: "boolean" }, emailAvailable: { type: "boolean" }, browserPushAvailable: { type: "boolean" }, browserSubscribed: { type: "boolean" }, vapidPublicKey: { type: "string", nullable: true } } },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          requestId: {
            type: "string",
            format: "uuid",
            description: "Support reference included with unexpected server errors.",
          },
        },
      },
    },
  },
  paths: {
    "/api/health": { get: { tags: ["Health"], summary: "Check whether the API is running", description: "Use this endpoint for container health checks and load-balancer probes. It does not require authentication.", responses: { "200": { description: "The API is healthy." } } } },
    "/api/auth/signup": { post: { tags: ["Authentication"], summary: "Create a password account", description: "Creates a private user account, hashes the password with bcrypt, and starts an authenticated session. Available when password authentication is enabled and protected by separate Redis account/IP attempt limits.", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "username", "email", "password"], properties: { name: { type: "string", minLength: 2, maxLength: 80 }, username: { type: "string", minLength: 3, maxLength: 32, pattern: "^[a-zA-Z0-9_-]+$" }, email: { type: "string", format: "email", maxLength: 254 }, password: { type: "string", format: "password", minLength: 12, maxLength: 72, description: "Must include uppercase and lowercase letters and a number." } } } } } }, responses: { "201": { description: "Account created and session started." }, "400": { description: "Account details failed validation.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }, "409": { description: "The username or email is already registered.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }, "429": { description: "Account or IP signup-attempt limit reached.", headers: { "Retry-After": { schema: { type: "integer" } } }, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } } } },
    "/api/auth/login": { post: { tags: ["Authentication"], summary: "Sign in with username and password", description: "Creates the secure session cookie used by protected endpoints. Redis-backed account and IP limits progressively delay repeated attempts and temporarily lock abusive clients.", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["username", "password"], properties: { username: { type: "string" }, password: { type: "string", format: "password" } } } } } }, responses: { "200": { description: "Signed in and session created." }, "401": { description: "Invalid credentials. The response does not identify which credential failed.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }, "429": { description: "Account or IP attempt limit reached. Retry-After contains the remaining lockout duration.", headers: { "Retry-After": { schema: { type: "integer" }, description: "Seconds until another attempt is permitted." } }, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } } } },
    "/api/auth/session": { get: { tags: ["Authentication"], summary: "Get the current signed-in user", description: "Lets the frontend restore authentication state after a page refresh.", responses: { "200": { description: "Current session details." } } } },
    "/api/auth/logout": { post: { tags: ["Authentication"], summary: "Sign out the current user", description: "Clears the session cookie and ends the current login session.", responses: { "204": { description: "Signed out." } } } },
    "/api/applications": {
      get: { tags: ["Applications"], summary: "List applications", description: "Returns the signed-in user's applications for the table, board, and search views.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Applications", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Application" } } } } } } },
      post: { tags: ["Applications"], summary: "Create an application", description: "Adds a company and role to the user's job-search pipeline. A resume upload can be attached separately before saving.", security: [{ sessionCookie: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ApplicationInput" } } } }, responses: { "201": { description: "Application created." }, "400": { description: "Validation error" } } },
    },
    "/api/applications/search": { get: { tags: ["Applications"], summary: "Search, filter, sort, and paginate applications", description: "Supports text search, status/source/date filters, sorting, and page sizes of 10, 20, or 50.", security: [{ sessionCookie: [] }], parameters: [
      { name: "search", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { $ref: "#/components/schemas/ApplicationStatus" } }, { name: "source", in: "query", schema: { type: "string" } },
      { name: "appliedFrom", in: "query", schema: { type: "string", format: "date" } }, { name: "appliedTo", in: "query", schema: { type: "string", format: "date" } },
      { name: "sortBy", in: "query", schema: { type: "string", enum: ["appliedAt", "createdAt", "updatedAt", "company"], default: "createdAt" } }, { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
      { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", enum: [10, 20, 50], default: 20 } },
    ], responses: { "200": { description: "Paginated discovery result." }, "400": { description: "Invalid query." } } } },
    "/api/applications/resume-uploads": {
      post: { tags: ["Resumes"], summary: "Prepare a resume upload", description: "Validates file metadata and returns either S3 form fields or database fallback instructions.", security: [{ sessionCookie: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["fileName", "mimeType", "size"], properties: { fileName: { type: "string" }, mimeType: { type: "string" }, size: { type: "integer", maximum: 5242880 } } } } } }, responses: { "200": { description: "Upload preparation." }, "400": { description: "Unsupported or oversized file." } } },
      delete: { tags: ["Resumes"], summary: "Abandon a pending resume upload", description: "Deletes a pending object owned by the current user.", security: [{ sessionCookie: [] }], responses: { "204": { description: "Pending upload removed." } } },
    },
    "/api/applications/{id}/events": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], get: { tags: ["Applications"], summary: "List application timeline events", security: [{ sessionCookie: [] }], responses: { "200": { description: "Chronological events." } } }, post: { tags: ["Applications"], summary: "Add a manual timeline note", security: [{ sessionCookie: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["type", "description", "occurredAt"], properties: { type: { type: "string", enum: ["NOTE"] }, description: { type: "string", maxLength: 2000 }, occurredAt: { type: "string", format: "date-time" } } } } } }, responses: { "201": { description: "Event created." } } } },
    "/api/applications/{id}/reminders": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], get: { tags: ["Reminders"], summary: "List reminders for an application", security: [{ sessionCookie: [] }], responses: { "200": { description: "Application reminders." } } }, post: { tags: ["Reminders"], summary: "Create an application reminder", security: [{ sessionCookie: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["type", "description", "dueAt"], properties: { type: { type: "string", enum: ["FOLLOW_UP", "DEADLINE"] }, description: { type: "string", maxLength: 200 }, dueAt: { type: "string", format: "date-time" } } } } } }, responses: { "201": { description: "Reminder created." } } } },
    "/api/applications/{id}/resume-download": { get: { tags: ["Resumes"], summary: "Prepare a private resume download", description: "Returns a short-lived S3 URL or indicates database fallback mode.", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Download preparation." }, "404": { description: "Application or resume not found." } } } },
    "/api/applications/{id}/resume": { get: { tags: ["Resumes"], summary: "View an attached resume", description: "Returns an owned resume inline or redirects to a short-lived inline S3 URL for private in-app preview.", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Inline resume file bytes." }, "302": { description: "Redirect to a short-lived inline S3 URL." }, "404": { description: "Resume not found." } } } },
    "/api/applications/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["Applications"], summary: "Get an application", description: "Loads the complete application details for the details page, including its timeline and attached resume metadata.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Application", content: { "application/json": { schema: { $ref: "#/components/schemas/Application" } } } }, "404": { description: "Not found" } } },
      patch: { tags: ["Applications"], summary: "Update an application", description: "Changes editable application fields such as status, notes, URLs, dates, or attached resume. Status changes also create a timeline event transactionally.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Updated" }, "400": { description: "Validation error" } } },
      delete: { tags: ["Applications"], summary: "Delete an application", description: "Permanently removes the selected application and its related user-owned records.", security: [{ sessionCookie: [] }], responses: { "204": { description: "Deleted" } } },
    },
    "/api/dashboard/summary": { get: { tags: ["Dashboard"], summary: "Get dashboard metrics", description: "Returns pipeline counts, source analytics, response/interview/offer rates, and milestone summaries for the dashboard.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Dashboard summary." } } } },
    "/api/resumes/uploads": { get: { tags: ["Resumes"], summary: "List uploaded resumes", description: "Shows the signed-in user's uploaded resume files and the applications they are attached to.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Uploaded resumes." } } } },
    "/api/resumes": { get: { tags: ["Resumes"], summary: "List reusable resume tags", security: [{ sessionCookie: [] }], responses: { "200": { description: "Resume tags." } } }, post: { tags: ["Resumes"], summary: "Create a reusable resume tag", security: [{ sessionCookie: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string", maxLength: 80 }, notes: { type: "string", nullable: true, maxLength: 500, deprecated: true, description: "Legacy field retained for API compatibility; the tag interface does not use notes." } } } } } }, responses: { "201": { description: "Resume tag created." }, "409": { description: "Name already exists." } } } },
    "/api/resumes/{id}": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], patch: { tags: ["Resumes"], summary: "Update a reusable resume tag", security: [{ sessionCookie: [] }], responses: { "200": { description: "Resume tag updated." } } }, delete: { tags: ["Resumes"], summary: "Delete an unused resume tag", security: [{ sessionCookie: [] }], responses: { "204": { description: "Resume tag deleted." }, "409": { description: "Tag is still assigned to applications." } } } },
    "/api/reminders": { get: { tags: ["Reminders"], summary: "List open reminders", description: "Returns follow-up reminders so the frontend can show upcoming and overdue actions.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Reminders." } } } },
    "/api/reminders/suggestions": { get: { tags: ["Reminders"], summary: "List suggested follow-ups", description: "Finds eligible applications that may need a follow-up reminder.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Follow-up suggestions." } } } },
    "/api/reminders/suggestions/{id}": { post: { tags: ["Reminders"], summary: "Create a suggested follow-up", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "201": { description: "Suggested reminder created." } } } },
    "/api/reminders/{id}": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], patch: { tags: ["Reminders"], summary: "Complete or reopen a reminder", security: [{ sessionCookie: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["completed"], properties: { completed: { type: "boolean" } } } } } }, responses: { "200": { description: "Reminder updated." } } }, delete: { tags: ["Reminders"], summary: "Delete a reminder", security: [{ sessionCookie: [] }], responses: { "204": { description: "Reminder deleted." } } } },
    "/api/gmail/status": { get: { tags: ["Gmail"], summary: "Get Gmail connection status", description: "Indicates whether Gmail is connected, its automatic schedule and retry state, and when synchronization last completed.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Gmail status.", content: { "application/json": { schema: { $ref: "#/components/schemas/GmailStatus" } } } } } } },
    "/api/gmail/connect": { get: { tags: ["Gmail"], summary: "Start Gmail authorization", description: "Returns or redirects to the Google OAuth consent flow for the current user.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Authorization information." }, "503": { description: "Gmail is not configured." } } } },
    "/api/gmail/callback": { get: { tags: ["Gmail"], summary: "Complete Gmail authorization", description: "Validates OAuth state, stores encrypted credentials, and redirects to the frontend.", parameters: [{ name: "code", in: "query", schema: { type: "string" } }, { name: "error", in: "query", schema: { type: "string" } }, { name: "state", in: "query", required: true, schema: { type: "string" } }], responses: { "302": { description: "Redirect to Gmail settings page." } } } },
    "/api/gmail/sync": { post: { tags: ["Gmail"], summary: "Synchronize Gmail metadata", description: "Runs an incremental, deduplicated manual synchronization and creates pending update reviews.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Synchronization summary." }, "409": { description: "Gmail is not connected." } } } },
    "/api/gmail/schedule": { patch: { tags: ["Gmail"], summary: "Configure automatic Gmail synchronization", description: "Enables, changes, or disables a user-scoped BullMQ schedule. Jobs retry temporary failures with exponential backoff.", security: [{ sessionCookie: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["enabled", "intervalMinutes"], properties: { enabled: { type: "boolean" }, intervalMinutes: { type: "integer", enum: [15, 30, 60, 180, 360, 720, 1440] } } } } } }, responses: { "200": { description: "Updated Gmail status and schedule.", content: { "application/json": { schema: { $ref: "#/components/schemas/GmailStatus" } } } }, "400": { description: "Unsupported schedule." }, "409": { description: "Gmail is not connected." }, "503": { description: "Redis queue is temporarily unavailable." } } } },
    "/api/gmail/reviews": { get: { tags: ["Gmail"], summary: "List pending Gmail update reviews", security: [{ sessionCookie: [] }], responses: { "200": { description: "Pending reviews." } } } },
    "/api/gmail/reviews/{id}": { patch: { tags: ["Gmail"], summary: "Resolve a Gmail update review", description: "Confirms a status update, creates an application with an optional owned resume tag and private resume attachment, or ignores the suggestion. Creation accepts JSON with a prepared resumeUploadKey or multipart form data with a resume file.", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Resolved review." }, "400": { description: "Invalid decision, resume, or upload." }, "404": { description: "Review, application, or resume tag not found." }, "409": { description: "Review already resolved." } } } },
    "/api/gmail/connection": { delete: { tags: ["Gmail"], summary: "Disconnect Gmail", description: "Deletes stored Gmail authorization and synchronized references without changing applications.", security: [{ sessionCookie: [] }], responses: { "204": { description: "Gmail disconnected." } } } },
    "/api/browser-extension/tokens": {
      get: { tags: ["Browser Extension"], summary: "List active browser-extension tokens", description: "Lists token names, prefixes, use timestamps, and expiry without exposing secret values.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Active tokens." } } },
      post: { tags: ["Browser Extension"], summary: "Create browser-extension access", description: "Creates a 90-day capture-only bearer token. The complete secret is returned once and only its SHA-256 hash is stored.", security: [{ sessionCookie: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string", maxLength: 80 } } } } } }, responses: { "201": { description: "Token created and shown once." }, "400": { description: "Invalid token name." } } },
    },
    "/api/browser-extension/tokens/{id}": { delete: { tags: ["Browser Extension"], summary: "Revoke browser-extension access", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "204": { description: "Token revoked." }, "404": { description: "Owned active token not found." } } } },
    "/api/browser-extension/captures": { post: { tags: ["Browser Extension"], summary: "Save a reviewed job posting", description: "Creates a SAVED application and preserves reviewed posting details, including skills, experience, salary, location, work mode, description, source URL, and capture time.", security: [{ extensionToken: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["company", "jobTitle", "jobUrl", "jobDescription"], properties: { company: { type: "string", maxLength: 200 }, jobTitle: { type: "string", maxLength: 200 }, location: { type: "string", nullable: true, maxLength: 200 }, jobUrl: { type: "string", format: "uri" }, jobDescription: { type: "string", maxLength: 50000 }, skills: { type: "array", maxItems: 50, items: { type: "string", maxLength: 100 } }, experienceRequirements: { type: "string", nullable: true, maxLength: 5000 }, salaryMin: { type: "number", minimum: 0, nullable: true }, salaryMax: { type: "number", minimum: 0, nullable: true }, salaryCurrency: { type: "string", pattern: "^[A-Z]{3}$", nullable: true }, salaryPeriod: { type: "string", enum: ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"], nullable: true }, workMode: { type: "string", enum: ["REMOTE", "HYBRID", "ONSITE"], nullable: true } } } } } }, responses: { "201": { description: "Captured application with structured posting fields." }, "400": { description: "Invalid reviewed posting or salary range." }, "401": { description: "Token invalid, expired, or revoked." } } } },
    "/api/notifications/settings": {
      get: { tags: ["Notifications"], summary: "Get reminder notification settings", description: "Returns the signed-in user's enabled channels and server delivery capabilities.", security: [{ sessionCookie: [] }], responses: { "200": { description: "Notification settings.", content: { "application/json": { schema: { $ref: "#/components/schemas/NotificationSettings" } } } } } },
      patch: { tags: ["Notifications"], summary: "Choose reminder notification channels", security: [{ sessionCookie: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["emailEnabled", "browserPushEnabled"], properties: { emailEnabled: { type: "boolean" }, browserPushEnabled: { type: "boolean" } } } } } }, responses: { "200": { description: "Updated settings." }, "400": { description: "Invalid preferences." } } },
    },
    "/api/notifications/subscriptions": {
      post: { tags: ["Notifications"], summary: "Register this browser for Web Push", security: [{ sessionCookie: [] }], responses: { "204": { description: "Subscription registered." }, "400": { description: "Invalid subscription." } } },
      delete: { tags: ["Notifications"], summary: "Remove this browser's Web Push subscription", security: [{ sessionCookie: [] }], responses: { "204": { description: "Subscription removed." } } },
    },
  },
};

// Route-level JSDoc is merged into the central document so descriptions stay close
// to the handlers while shared schemas and security definitions remain centralized.
export const generatedOpenApiDocument = swaggerJSDoc({
  definition: openApiDocument,
  apis: ["**/src/routes/*.ts", "**/dist/routes/*.js"],
}) as OpenAPIV3.Document;
