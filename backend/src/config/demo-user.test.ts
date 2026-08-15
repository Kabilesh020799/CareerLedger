import { describe, expect, it } from "vitest";
import { parseConfiguredDemoUsers } from "./demo-user";

describe("demo user configuration", () => {
  it("does not create demo identities when environment configuration is absent", () => {
    expect(parseConfiguredDemoUsers({})).toEqual([]);
  });

  it("normalizes complete environment-configured identities", () => {
    expect(
      parseConfiguredDemoUsers({
        DEMO_USER_USERNAME: " First_Demo ",
        DEMO_USER_PASSWORD: "StrongTestPassword1",
        DEMO_USER_EMAIL: " FIRST@EXAMPLE.INVALID ",
        DEMO_USER_2_USERNAME: "second_demo",
        DEMO_USER_2_PASSWORD: "StrongTestPassword2",
        DEMO_USER_2_EMAIL: "second@example.invalid",
        DEMO_USER_2_NAME: "Second Demo",
      }),
    ).toEqual([
      {
        username: "first_demo",
        password: "StrongTestPassword1",
        email: "first@example.invalid",
        name: "first_demo",
      },
      {
        username: "second_demo",
        password: "StrongTestPassword2",
        email: "second@example.invalid",
        name: "Second Demo",
      },
    ]);
  });

  it("rejects partially configured identities", () => {
    expect(() =>
      parseConfiguredDemoUsers({ DEMO_USER_USERNAME: "incomplete" }),
    ).toThrow(/must be configured together/);
  });
});
