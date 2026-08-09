import cors from "cors";
import express from "express";
import helmet from "helmet";
import session from "express-session";
import { authConfig } from "./config/auth";
import { passport } from "./config/passport";
import { requireAuth } from "./middleware/require-auth";
import { applicationRouter } from "./routes/application.routes";
import { authRouter } from "./routes/auth.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { reminderRouter } from "./routes/reminder.routes";
import { PrismaSessionStore } from "./services/session-store";

export function createApp() {
  const app = express();

  if (authConfig.isProduction) app.set("trust proxy", 1);

  app.use(cors({ origin: authConfig.frontendUrl, credentials: true }));
  app.use(helmet());
  app.use(express.json());
  app.use(
    session({
      name: "job-tracker-session",
      secret: authConfig.sessionSecret,
      store: new PrismaSessionStore(),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
        secure: authConfig.secureCookie,
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/applications", requireAuth, applicationRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);
  app.use("/api/reminders", requireAuth, reminderRouter);

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
