import { describe, expect, it } from "vitest";
import { parseAllowedAccountEmails } from "./openai";

describe("OpenAI account allowlist", () => {
  it("normalizes and deduplicates comma-separated account emails", () => {
    expect(
      [...parseAllowedAccountEmails(" User@Example.com,second@example.com,user@example.com ")],
    ).toEqual(["user@example.com", "second@example.com"]);
  });

  it("denies every account when the allowlist is absent", () => {
    expect(parseAllowedAccountEmails(undefined).size).toBe(0);
  });
});
