"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationResumeController = void 0;
const application_resume_storage_service_1 = require("../services/application-resume-storage.service");
const application_resume_validator_1 = require("../validators/application-resume.validator");
function getUserId(req) {
    if (!req.user)
        throw new Error("Authenticated user is missing");
    return req.user.id;
}
exports.applicationResumeController = {
    async prepareUpload(req, res) {
        const parsed = application_resume_validator_1.createApplicationResumeUploadSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Invalid resume upload",
                details: parsed.error.flatten(),
            });
            return;
        }
        if (!application_resume_storage_service_1.applicationResumeStorageService.isConfigured()) {
            res.json({ mode: "database" });
            return;
        }
        const result = await application_resume_storage_service_1.applicationResumeStorageService.prepareUpload(getUserId(req), parsed.data);
        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }
        res.status(201).json(result.data);
    },
    async abandonUpload(req, res) {
        const parsed = application_resume_validator_1.applicationResumeUploadKeySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid resume upload" });
            return;
        }
        const deleted = await application_resume_storage_service_1.applicationResumeStorageService.abandonUpload(getUserId(req), parsed.data.storageKey);
        if (!deleted) {
            res.status(404).json({ error: "Uploaded resume not found" });
            return;
        }
        res.status(204).send();
    },
};
