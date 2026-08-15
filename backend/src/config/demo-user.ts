import "dotenv/config";

export interface ConfiguredDemoUser {
  username: string;
  password: string;
  email: string;
  name: string;
}

type DemoUserEnvironment = Record<string, string | undefined>;

function configuredDemoUser(
  environment: DemoUserEnvironment,
  suffix: "" | "_2",
): ConfiguredDemoUser | null {
  const username = environment[`DEMO_USER${suffix}_USERNAME`]?.trim().toLowerCase();
  const password = environment[`DEMO_USER${suffix}_PASSWORD`];
  const email = environment[`DEMO_USER${suffix}_EMAIL`]?.trim().toLowerCase();
  const name = environment[`DEMO_USER${suffix}_NAME`]?.trim();

  if (!username && !password && !email && !name) return null;
  if (!username || !password || !email) {
    throw new Error(
      `DEMO_USER${suffix}_USERNAME, DEMO_USER${suffix}_PASSWORD, and DEMO_USER${suffix}_EMAIL must be configured together`,
    );
  }
  return { username, password, email, name: name || username };
}

export function parseConfiguredDemoUsers(
  environment: DemoUserEnvironment,
): ConfiguredDemoUser[] {
  return [configuredDemoUser(environment, ""), configuredDemoUser(environment, "_2")].filter(
    (user): user is ConfiguredDemoUser => user !== null,
  );
}

/** Demo identities configured entirely through the server environment. */
export const configuredDemoUsers = parseConfiguredDemoUsers(process.env);

export const firstConfiguredDemoUser = configuredDemoUsers[0] ?? null;
