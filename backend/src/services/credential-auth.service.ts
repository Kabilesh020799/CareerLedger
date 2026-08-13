import { compare, hash, hashSync } from "bcryptjs";
import { prisma } from "../config/prisma";
import type { PasswordLoginInput, PasswordSignupInput } from "../validators/auth.validator";

const FALLBACK_PASSWORD_HASH = hashSync("unavailable-account-password", 12);
const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  avatarUrl: true,
  emailVerifiedAt: true,
} as const;

export class CredentialAlreadyExistsError extends Error {}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export const credentialAuthService = {
  async register(input: PasswordSignupInput) {
    try {
      return await prisma.user.create({
        data: {
          name: input.name.trim(),
          username: input.username.trim().toLowerCase(),
          email: input.email.trim().toLowerCase(),
          passwordHash: await hash(input.password, 12),
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new CredentialAlreadyExistsError("An account already exists with that username or email");
      }
      throw error;
    }
  },

  async authenticate({ username, password }: PasswordLoginInput) {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { ...publicUserSelect, passwordHash: true },
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
