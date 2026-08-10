"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationController = void 0;
const application_service_1 = require("../services/application.service");
const application_resume_service_1 = require("../services/application-resume.service");
const application_discovery_validator_1 = require("../validators/application-discovery.validator");
const application_validator_1 = require("../validators/application.validator");
const application_resume_validator_1 = require("../validators/application-resume.validator");
function validationError(res, error) {
    return res.status(400).json({
        error: "Invalid application data",
        details: error,
    });
}
function getId(req) {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
}
function getUserId(req) {
    if (!req.user)
        throw new Error("Authenticated user is missing");
    return req.user.id;
}
exports.applicationController = {
    async list(req, res) {
        const applications = await application_service_1.applicationService.list(getUserId(req));
        res.json(applications);
    },
    async search(req, res) {
        const parsed = application_discovery_validator_1.applicationDiscoverySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                error: "Invalid application query",
                details: parsed.error.flatten(),
            });
            return;
        }
        const result = await application_service_1.applicationService.search(getUserId(req), parsed.data);
        res.json(result);
    },
    async create(req, res) {
        const parsed = application_validator_1.createApplicationSchema.safeParse(req.body);
        if (!parsed.success)
            return validationError(res, parsed.error.flatten());
        const resume = (0, application_resume_validator_1.validateApplicationResume)(req.file);
        if (!resume.success) {
            res.status(400).json({ error: resume.error });
            return;
        }
        const application = await application_service_1.applicationService.create(getUserId(req), parsed.data, resume.data);
        if (!application) {
            res.status(400).json({ error: "Resume version not found" });
            return;
        }
        res.status(201).json(application);
    },
    async getById(req, res) {
        const application = await application_service_1.applicationService.findById(getUserId(req), getId(req));
        if (!application) {
            res.status(404).json({ error: "Application not found" });
            return;
        }
        res.json(application);
    },
    async downloadResume(req, res) {
        const resume = await application_resume_service_1.applicationResumeService.findForApplication(getUserId(req), getId(req));
        if (!resume) {
            res.status(404).json({ error: "Resume not found" });
            return;
        }
        res.setHeader("Content-Type", resume.mimeType);
        res.setHeader("Content-Length", String(resume.size));
        res.setHeader("Content-Disposition", `attachment; filename="${resume.fileName}"`);
        res.send(Buffer.from(resume.content));
    },
    async update(req, res) {
        const parsed = application_validator_1.updateApplicationSchema.safeParse(req.body);
        if (!parsed.success)
            return validationError(res, parsed.error.flatten());
        const application = await application_service_1.applicationService.update(getUserId(req), getId(req), parsed.data);
        if (application === false) {
            res.status(400).json({ error: "Resume version not found" });
            return;
        }
        if (!application) {
            res.status(404).json({ error: "Application not found" });
            return;
        }
        res.json(application);
    },
    async remove(req, res) {
        const deleted = await application_service_1.applicationService.remove(getUserId(req), getId(req));
        if (!deleted) {
            res.status(404).json({ error: "Application not found" });
            return;
        }
        res.status(204).send();
    },
};
