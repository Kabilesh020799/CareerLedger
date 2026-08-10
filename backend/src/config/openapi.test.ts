import { describe, expect, it } from "vitest";
import { generatedOpenApiDocument } from "./openapi";

const documentedOperations = [
  ["/api/health", "get"], ["/api/auth/login", "post"], ["/api/auth/session", "get"], ["/api/auth/logout", "post"],
  ["/api/applications", "get"], ["/api/applications", "post"], ["/api/applications/search", "get"],
  ["/api/applications/{id}", "get"], ["/api/applications/{id}", "patch"], ["/api/applications/{id}", "delete"],
  ["/api/applications/resume-uploads", "post"], ["/api/applications/resume-uploads", "delete"],
  ["/api/applications/{id}/events", "get"], ["/api/applications/{id}/events", "post"],
  ["/api/applications/{id}/reminders", "get"], ["/api/applications/{id}/reminders", "post"],
  ["/api/applications/{id}/resume", "get"], ["/api/applications/{id}/resume-download", "get"],
  ["/api/dashboard/summary", "get"], ["/api/resumes", "get"], ["/api/resumes", "post"],
  ["/api/resumes/uploads", "get"], ["/api/resumes/{id}", "patch"], ["/api/resumes/{id}", "delete"],
  ["/api/reminders", "get"], ["/api/reminders/suggestions", "get"], ["/api/reminders/suggestions/{id}", "post"],
  ["/api/reminders/{id}", "patch"], ["/api/reminders/{id}", "delete"],
  ["/api/gmail/status", "get"], ["/api/gmail/connect", "get"], ["/api/gmail/callback", "get"],
  ["/api/gmail/sync", "post"], ["/api/gmail/reviews", "get"], ["/api/gmail/reviews/{id}", "patch"],
  ["/api/gmail/schedule", "patch"],
  ["/api/gmail/connection", "delete"],
  ["/api/browser-extension/tokens", "get"], ["/api/browser-extension/tokens", "post"],
  ["/api/browser-extension/tokens/{id}", "delete"], ["/api/browser-extension/captures", "post"],
] as const;

describe("OpenAPI documentation", () => {
  it.each(documentedOperations)("documents %s %s with a purpose", (path, method) => {
    const operation = generatedOpenApiDocument.paths[path]?.[method];
    expect(operation).toBeDefined();
    expect(operation && "$ref" in operation ? undefined : operation?.summary).toBeTruthy();
  });

  it("documents password-login throttling and its retry interval", () => {
    const operation = generatedOpenApiDocument.paths["/api/auth/login"]?.post;
    const responses = operation && !("$ref" in operation) ? operation.responses : undefined;

    expect(responses?.["429"]).toMatchObject({
      headers: {
        "Retry-After": {
          schema: { type: "integer" },
        },
      },
    });
  });
});
