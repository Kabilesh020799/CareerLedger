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
import { gmailRouter } from "./routes/gmail.routes";
import { reminderRouter } from "./routes/reminder.routes";
import { notificationRouter } from "./routes/notification.routes";
import { resumeVersionRouter } from "./routes/resume-version.routes";
import { PrismaSessionStore } from "./services/session-store";
import swaggerUi from "swagger-ui-express";
import { generatedOpenApiDocument } from "./config/openapi";
import { browserExtensionRouter } from "./routes/browser-extension.routes";
import { accountRouter } from "./routes/account.routes";
import { calendarFeedRouter, calendarRouter } from "./routes/calendar.routes";
import { workspaceRouter } from "./routes/workspace.routes";
import { dataTransferRouter } from "./routes/data-transfer.routes";
import { WorkspaceAccessError } from "./services/workspace-access.service";

export function createApp() {
  const app = express();

  if (authConfig.isProduction) app.set("trust proxy", 1);

  app.use(cors({
    origin(origin, callback) {
      const allowed = !origin || origin === authConfig.frontendUrl || /^(chrome|moz)-extension:\/\//.test(origin);
      callback(allowed ? null : new Error("Origin is not allowed"), allowed);
    },
    credentials: true,
  }));
  app.use(helmet());
  app.use(express.json({ limit: "10mb" }));
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

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(generatedOpenApiDocument));
  app.get("/api-docs.json", (_req, res) => res.json(generatedOpenApiDocument));

  app.use("/api/auth", authRouter);
  app.use("/api/calendar/feed", calendarFeedRouter);
  app.use("/api/browser-extension", browserExtensionRouter);
  app.use("/api/account", requireAuth, accountRouter);
  app.use("/api/calendar", requireAuth, calendarRouter);
  app.use("/api/workspaces", requireAuth, workspaceRouter);
  app.use("/api/data", requireAuth, dataTransferRouter);
  app.use("/api/applications", requireAuth, applicationRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);
  app.use("/api/gmail", requireAuth, gmailRouter);
  app.use("/api/reminders", requireAuth, reminderRouter);
  app.use("/api/notifications", requireAuth, notificationRouter);
  app.use("/api/resumes", requireAuth, resumeVersionRouter);

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof WorkspaceAccessError) {
        res.status(error.kind === "NOT_FOUND" ? 404 : 403).json({
          error: error.message,
        });
        return;
      }
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
