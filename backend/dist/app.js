"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_session_1 = __importDefault(require("express-session"));
const auth_1 = require("./config/auth");
const passport_1 = require("./config/passport");
const require_auth_1 = require("./middleware/require-auth");
const application_routes_1 = require("./routes/application.routes");
const auth_routes_1 = require("./routes/auth.routes");
const session_store_1 = require("./services/session-store");
function createApp() {
    const app = (0, express_1.default)();
    if (auth_1.authConfig.isProduction)
        app.set("trust proxy", 1);
    app.use((0, cors_1.default)({ origin: auth_1.authConfig.frontendUrl, credentials: true }));
    app.use((0, helmet_1.default)());
    app.use(express_1.default.json());
    app.use((0, express_session_1.default)({
        name: "job-tracker-session",
        secret: auth_1.authConfig.sessionSecret,
        store: new session_store_1.PrismaSessionStore(),
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: "lax",
            secure: auth_1.authConfig.secureCookie,
        },
    }));
    app.use(passport_1.passport.initialize());
    app.use(passport_1.passport.session());
    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok" });
    });
    app.use("/api/auth", auth_routes_1.authRouter);
    app.use("/api/applications", require_auth_1.requireAuth, application_routes_1.applicationRouter);
    app.use((error, _req, res, _next) => {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    });
    return app;
}
