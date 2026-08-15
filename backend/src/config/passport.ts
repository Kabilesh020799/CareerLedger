import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "./prisma";
import { authConfig, isGoogleAuthConfigured } from "./auth";
import { isUnprovisionedAdminAccount } from "./admin";

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  avatarUrl: true,
  emailVerifiedAt: true,
} as const;

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    done(null, user ?? false);
  } catch (error) {
    done(error);
  }
});

if (isGoogleAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: authConfig.googleClientId!,
        clientSecret: authConfig.googleClientSecret!,
        callbackURL: authConfig.googleCallbackUrl,
        state: true,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("Google account did not provide an email address"));
          }

          const existingByEmail = await prisma.user.findUnique({ where: { email } });
          if (isUnprovisionedAdminAccount(email, Boolean(existingByEmail))) {
            return done(new Error("An account already exists for this email address"));
          }
          if (existingByEmail && existingByEmail.googleId !== profile.id) {
            return done(new Error("An account already exists for this email address"));
          }

          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            create: {
              googleId: profile.id,
              email,
              name: profile.displayName || null,
              avatarUrl: profile.photos?.[0]?.value ?? null,
              emailVerifiedAt: new Date(),
            },
            update: {
              email,
              name: profile.displayName || null,
              avatarUrl: profile.photos?.[0]?.value ?? null,
              emailVerifiedAt: new Date(),
            },
            select: publicUserSelect,
          });

          done(null, user);
        } catch (error) {
          done(error);
        }
      },
    ),
  );
}

export { passport };
