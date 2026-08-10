import type { OpenAPIV3 } from "openapi-types";

export const openApiDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Job Application Tracker API",
    version: "3.7.0",
    description: "HTTP API for tracking applications, resumes, reminders, and Gmail sync.",
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
  ],
  components: {
    securitySchemes: {
      sessionCookie: { type: "apiKey", in: "cookie", name: "job-tracker-session" },
    },
    schemas: {
      Application: {
        type: "object",
        required: ["id", "company", "jobTitle", "status", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" }, company: { type: "string" }, jobTitle: { type: "string" },
          location: { type: "string", nullable: true }, jobUrl: { type: "string", nullable: true },
          source: { type: "string", nullable: true }, notes: { type: "string", nullable: true },
          status: { type: "string", enum: ["SAVED", "APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"] },
          appliedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
        },
      },
      Error: { type: "object", properties: { error: { type: "string" } } },
    },
  },
  paths: {
    "/api/health": { get: { tags: ["Health"], summary: "Check API health", responses: { "200": { description: "Healthy" } } } },
    "/api/auth/login": { post: { tags: ["Authentication"], summary: "Sign in with username and password", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["username", "password"], properties: { username: { type: "string" }, password: { type: "string", format: "password" } } } } } }, responses: { "200": { description: "Signed in" }, "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } } } },
    "/api/auth/session": { get: { tags: ["Authentication"], summary: "Get the current session", responses: { "200": { description: "Session details" } } } },
    "/api/auth/logout": { post: { tags: ["Authentication"], summary: "Sign out", responses: { "204": { description: "Signed out" } } } },
    "/api/applications": {
      get: { tags: ["Applications"], summary: "List applications", security: [{ sessionCookie: [] }], responses: { "200": { description: "Applications", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Application" } } } } } } },
      post: { tags: ["Applications"], summary: "Create an application", security: [{ sessionCookie: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Application" } } } }, responses: { "201": { description: "Created" }, "400": { description: "Validation error" } } },
    },
    "/api/applications/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["Applications"], summary: "Get an application", security: [{ sessionCookie: [] }], responses: { "200": { description: "Application", content: { "application/json": { schema: { $ref: "#/components/schemas/Application" } } } }, "404": { description: "Not found" } } },
      patch: { tags: ["Applications"], summary: "Update an application", security: [{ sessionCookie: [] }], responses: { "200": { description: "Updated" }, "400": { description: "Validation error" } } },
      delete: { tags: ["Applications"], summary: "Delete an application", security: [{ sessionCookie: [] }], responses: { "204": { description: "Deleted" } } },
    },
    "/api/dashboard/summary": { get: { tags: ["Dashboard"], summary: "Get dashboard metrics", security: [{ sessionCookie: [] }], responses: { "200": { description: "Summary" } } } },
    "/api/resumes/uploads": { get: { tags: ["Resumes"], summary: "List uploaded resumes", security: [{ sessionCookie: [] }], responses: { "200": { description: "Uploaded resumes" } } } },
    "/api/reminders": { get: { tags: ["Reminders"], summary: "List reminders", security: [{ sessionCookie: [] }], responses: { "200": { description: "Reminders" } } } },
    "/api/gmail/status": { get: { tags: ["Gmail"], summary: "Get Gmail connection status", security: [{ sessionCookie: [] }], responses: { "200": { description: "Gmail status" } } } },
  },
};
