"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gmailController = void 0;
const gmail_1 = require("../config/gmail");
const gmail_api_service_1 = require("../services/gmail-api.service");
const gmail_service_1 = require("../services/gmail.service");
const gmail_validator_1 = require("../validators/gmail.validator");
function getUser(req) {
    if (!req.user)
        throw new Error("Authenticated user is missing");
    return req.user;
}
function redirectToGmail(res, parameter) {
    res.redirect(`${gmail_1.gmailConfig.frontendUrl}/gmail?${parameter}`);
}
async function saveSession(req) {
    await new Promise((resolve, reject) => {
        req.session.save((error) => (error ? reject(error) : resolve()));
    });
}
function handleGmailError(error, res, next) {
    if (error instanceof gmail_service_1.GmailNotConfiguredError) {
        res.status(503).json({ error: "Gmail integration is not configured" });
        return;
    }
    if (error instanceof gmail_service_1.GmailNotConnectedError) {
        res.status(409).json({ error: "Connect Gmail before synchronizing" });
        return;
    }
    if (error instanceof gmail_api_service_1.GmailAuthorizationRequiredError) {
        res.status(409).json({
            error: "Gmail authorization has expired. Reconnect Gmail to continue.",
            code: "GMAIL_RECONNECT_REQUIRED",
        });
        return;
    }
    if (error instanceof gmail_api_service_1.GmailApiError) {
        res.status(502).json({ error: "Gmail could not complete the request" });
        return;
    }
    next(error);
}
exports.gmailController = {
    async status(req, res, next) {
        try {
            res.json(await gmail_service_1.gmailService.status(getUser(req).id));
        }
        catch (error) {
            next(error);
        }
    },
    async connect(req, res, next) {
        try {
            const authorization = gmail_service_1.gmailService.beginAuthorization(getUser(req).email);
            req.session.gmailOAuthState = authorization.state;
            await saveSession(req);
            res.redirect(authorization.authorizationUrl);
        }
        catch (error) {
            handleGmailError(error, res, next);
        }
    },
    async callback(req, res, next) {
        const parsed = gmail_validator_1.gmailCallbackQuerySchema.safeParse(req.query);
        const savedState = req.session.gmailOAuthState;
        delete req.session.gmailOAuthState;
        if (!parsed.success ||
            !savedState ||
            parsed.data.state !== savedState) {
            await saveSession(req);
            redirectToGmail(res, "error=state");
            return;
        }
        await saveSession(req);
        if (parsed.data.error || !parsed.data.code) {
            redirectToGmail(res, "error=denied");
            return;
        }
        try {
            await gmail_service_1.gmailService.completeAuthorization(getUser(req).id, parsed.data.code);
            redirectToGmail(res, "connected=true");
        }
        catch (error) {
            if (error instanceof gmail_service_1.GmailNotConfiguredError ||
                error instanceof gmail_api_service_1.GmailAuthorizationRequiredError ||
                error instanceof gmail_api_service_1.GmailApiError) {
                redirectToGmail(res, "error=oauth");
                return;
            }
            next(error);
        }
    },
    async synchronize(req, res, next) {
        try {
            res.json(await gmail_service_1.gmailService.synchronize(getUser(req).id));
        }
        catch (error) {
            handleGmailError(error, res, next);
        }
    },
    async disconnect(req, res, next) {
        try {
            await gmail_service_1.gmailService.disconnect(getUser(req).id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    },
};
