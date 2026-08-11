import { hash } from "bcryptjs";
import { builtInDemoUsers } from "../config/demo-user";

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
      update: { passwordHash: string };
    }): Promise<unknown>;
  };
}

export async function bootstrapBuiltInDemoUsers(
  database: BootstrapUserDatabase,
  passwordHasher: PasswordHasher = hash,
) {
  for (const { username, password } of builtInDemoUsers) {
    const passwordHash = await passwordHasher(password, 12);

    await database.user.upsert({
      where: { username },
      create: {
        username,
        passwordHash,
        email: `${username}@jobtracker.invalid`,
        name: username,
      },
      update: { passwordHash },
    });
  }
}
