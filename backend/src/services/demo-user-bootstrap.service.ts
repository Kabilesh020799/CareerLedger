import { hash } from "bcryptjs";
import { configuredDemoUsers } from "../config/demo-user";

type PasswordHasher = (password: string, rounds: number) => Promise<string>;

interface BootstrapUserDatabase {
  user: {
    upsert(args: {
      where: { username: string };
      create: {
        username: string;
        passwordHash: string;
        email: string;
        name: string;
      };
      update: { passwordHash: string; email: string; name: string };
    }): Promise<unknown>;
  };
}

export async function bootstrapConfiguredDemoUsers(
  database: BootstrapUserDatabase,
  passwordHasher: PasswordHasher = hash,
) {
  for (const { username, password, email, name } of configuredDemoUsers) {
    const passwordHash = await passwordHasher(password, 12);

    await database.user.upsert({
      where: { username },
      create: {
        username,
        passwordHash,
        email,
        name,
      },
      update: { passwordHash, email, name },
    });
  }
}
