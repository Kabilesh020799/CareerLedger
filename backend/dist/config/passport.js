"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passport = void 0;
const passport_1 = __importDefault(require("passport"));
exports.passport = passport_1.default;
const passport_google_oauth20_1 = require("passport-google-oauth20");
const prisma_1 = require("./prisma");
const auth_1 = require("./auth");
const publicUserSelect = {
    id: true,
    username: true,
    email: true,
    name: true,
    avatarUrl: true,
};
passport_1.default.serializeUser((user, done) => done(null, user.id));
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
            select: publicUserSelect,
        });
        done(null, user ?? false);
    }
    catch (error) {
        done(error);
    }
});
if (auth_1.isGoogleAuthConfigured) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: auth_1.authConfig.googleClientId,
        clientSecret: auth_1.authConfig.googleClientSecret,
        callbackURL: auth_1.authConfig.googleCallbackUrl,
        state: true,
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            if (!email) {
                return done(new Error("Google account did not provide an email address"));
            }
            const existingByEmail = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (existingByEmail && existingByEmail.googleId !== profile.id) {
                return done(new Error("An account already exists for this email address"));
            }
            const user = await prisma_1.prisma.user.upsert({
                where: { googleId: profile.id },
                create: {
                    googleId: profile.id,
                    email,
                    name: profile.displayName || null,
                    avatarUrl: profile.photos?.[0]?.value ?? null,
                },
                update: {
                    email,
                    name: profile.displayName || null,
                    avatarUrl: profile.photos?.[0]?.value ?? null,
                },
                select: publicUserSelect,
            });
            done(null, user);
        }
        catch (error) {
            done(error);
        }
    }));
}
