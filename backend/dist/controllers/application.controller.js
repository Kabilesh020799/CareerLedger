"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationController = void 0;
const application_service_1 = require("../services/application.service");
const application_resume_service_1 = require("../services/application-resume.service");
const application_resume_storage_service_1 = require("../services/application-resume-storage.service");
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
async function resolveResume(req, userId, storageKey) {
    if (req.file && storageKey) {
        return {
            success: false,
            error: "Choose only one resume upload method",
        };
    }
    if (req.file && application_resume_storage_service_1.applicationResumeStorageService.isConfigured()) {
        return {
            success: false,
            error: "Prepare the resume upload before saving the application",
        };
    }
    if (storageKey) {
        return application_resume_storage_service_1.applicationResumeStorageService.finalizeUpload(userId, storageKey);
    }
    return (0, application_resume_validator_1.validateApplicationResume)(req.file);
}
async function abandonResolvedUpload(userId, storageKey) {
    if (!storageKey)
        return;
    try {
        await application_resume_storage_service_1.applicationResumeStorageService.abandonUpload(userId, storageKey);
    }
    catch {
        // The bucket lifecycle policy remains the final fallback for unfinished uploads.
    }
}
function resolvedStorageKey(resume, requestedStorageKey) {
    if (resume.success &&
        resume.data &&
        "storageKey" in resume.data) {
        return resume.data.storageKey;
    }
    return requestedStorageKey;
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
        const userId = getUserId(req);
        const resume = await resolveResume(req, userId, parsed.data.resumeUploadKey);
        const cleanupStorageKey = resolvedStorageKey(resume, parsed.data.resumeUploadKey);
        if (!resume.success) {
            await abandonResolvedUpload(userId, cleanupStorageKey);
            res.status(400).json({ error: resume.error });
            return;
        }
        let application;
        try {
            application = await application_service_1.applicationService.create(userId, parsed.data, resume.data);
        }
        catch (error) {
            await abandonResolvedUpload(userId, cleanupStorageKey);
            throw error;
        }
        if (!application) {
            await abandonResolvedUpload(userId, cleanupStorageKey);
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
        if (resume.kind === "s3") {
            res.redirect(302, resume.url);
            return;
        }
        res.setHeader("Content-Type", resume.mimeType);
        res.setHeader("Content-Length", String(resume.size));
        res.setHeader("Content-Disposition", `attachment; filename="${resume.fileName}"`);
        res.send(Buffer.from(resume.content));
    },
    async getResumeDownload(req, res) {
        const resume = await application_resume_service_1.applicationResumeService.findForApplication(getUserId(req), getId(req));
        if (!resume) {
            res.status(404).json({ error: "Resume not found" });
            return;
        }
        res.json({
            mode: resume.kind,
            url: resume.kind === "s3" ? resume.url : null,
        });
    },
    async update(req, res) {
        const parsed = application_validator_1.updateApplicationSchema.safeParse(req.body);
        if (!parsed.success)
            return validationError(res, parsed.error.flatten());
        const userId = getUserId(req);
        const resume = await resolveResume(req, userId, parsed.data.resumeUploadKey);
        const cleanupStorageKey = resolvedStorageKey(resume, parsed.data.resumeUploadKey);
        if (!resume.success) {
            await abandonResolvedUpload(userId, cleanupStorageKey);
            res.status(400).json({ error: resume.error });
            return;
        }
        let application;
        try {
            application = await application_service_1.applicationService.update(userId, getId(req), parsed.data, resume.data);
        }
        catch (error) {
            await abandonResolvedUpload(userId, cleanupStorageKey);
            throw error;
        }
        if (application === false) {
            await abandonResolvedUpload(userId, cleanupStorageKey);
            res.status(400).json({ error: "Resume version not found" });
            return;
        }
        if (!application) {
            await abandonResolvedUpload(userId, cleanupStorageKey);
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
