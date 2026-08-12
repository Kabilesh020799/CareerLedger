import { describe, expect, it } from "vitest";
import { passwordSignupSchema } from "./auth.validator";

const validSignup = {
  name: "New User",
  username: "new_user",
  email: "person@example.com",
  password: "SecurePassword1",
};

describe("passwordSignupSchema", () => {
  it("normalizes valid account fields", () => {
    expect(passwordSignupSchema.parse({
      ...validSignup,
      username: " New_User ",
      email: " PERSON@EXAMPLE.COM ",
    })).toMatchObject({ username: "New_User", email: "person@example.com" });
  });

  it.each([
    [{ ...validSignup, username: "bad username" }, "username"],
    [{ ...validSignup, email: "invalid" }, "email"],
    [{ ...validSignup, password: "too-short" }, "password"],
    [{ ...validSignup, password: "alllowercase123" }, "password"],
  ])("rejects unsafe account input", (input, path) => {
    const result = passwordSignupSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toContain(path);
  });
});
