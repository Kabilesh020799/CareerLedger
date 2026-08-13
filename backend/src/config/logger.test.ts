import pino from "pino";
import { describe, expect, it } from "vitest";
import { loggerOptions } from "./logger";

describe("structured logger", () => {
  it("redacts credentials, cookies, tokens, and private document fields", () => {
    const records: string[] = [];
    const destination = { write(chunk: string) { records.push(chunk); } };
    const testLogger = pino({ ...loggerOptions, level: "info" }, destination);

    testLogger.info({
      password: "secret-password",
      token: "secret-token",
      req: { headers: { authorization: "Bearer secret", cookie: "session=secret" } },
      resume: "private-pdf",
      presignedUrl: "https://storage.example/private-token",
      safeField: "visible",
    }, "redaction test");

    const output = records.join("");
    expect(output).toContain("visible");
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("secret-password");
    expect(output).not.toContain("secret-token");
    expect(output).not.toContain("session=secret");
    expect(output).not.toContain("private-pdf");
    expect(output).not.toContain("storage.example");
  });
});
