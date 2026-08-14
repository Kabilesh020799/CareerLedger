declare global {
  namespace Express {
    interface User {
      id: string;
      username: string | null;
      email: string;
      name: string | null;
      avatarUrl: string | null;
      emailVerifiedAt: Date | null;
    }
    interface Request {
      extensionUserId?: string;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    gmailOAuthState?: string;
    passport?: { user?: string };
  }
}

export {};
