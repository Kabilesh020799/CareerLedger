import { compare, hashSync } from "bcryptjs";
import { prisma } from "../config/prisma";
import type { PasswordLoginInput } from "../validators/auth.validator";

const FALLBACK_PASSWORD_HASH = hashSync("unavailable-account-password", 12);

export const credentialAuthService = {
  async authenticate({ username, password }: PasswordLoginInput) {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatarUrl: true,
        passwordHash: true,
      },
    });

    const passwordMatches = await compare(
      password,
      user?.passwordHash ?? FALLBACK_PASSWORD_HASH,
    );

    if (!user?.passwordHash || !passwordMatches) {
      return null;
    }

    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  },
};
