"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeVersionController = void 0;
const resume_version_service_1 = require("../services/resume-version.service");
const resume_version_validator_1 = require("../validators/resume-version.validator");
function getUserId(req) {
    if (!req.user)
        throw new Error("Authenticated user is missing");
    return req.user.id;
}
function getId(req) {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
}
function validationError(res, details) {
    res.status(400).json({ error: "Invalid resume version data", details });
}
exports.resumeVersionController = {
    async list(req, res) {
        res.json(await resume_version_service_1.resumeVersionService.list(getUserId(req)));
    },
    async listUploaded(req, res) {
        res.json(await resume_version_service_1.resumeVersionService.listUploaded(getUserId(req)));
    },
    async create(req, res) {
        const parsed = resume_version_validator_1.createResumeVersionSchema.safeParse(req.body);
        if (!parsed.success) {
            validationError(res, parsed.error.flatten());
            return;
        }
        const result = await resume_version_service_1.resumeVersionService.create(getUserId(req), parsed.data);
        if (result.kind === "conflict") {
            res.status(409).json({ error: "A resume version with this name already exists" });
            return;
        }
        res.status(201).json(result.data);
    },
    async update(req, res) {
        const parsed = resume_version_validator_1.updateResumeVersionSchema.safeParse(req.body);
        if (!parsed.success) {
            validationError(res, parsed.error.flatten());
            return;
        }
        const result = await resume_version_service_1.resumeVersionService.update(getUserId(req), getId(req), parsed.data);
        if (result.kind === "not_found") {
            res.status(404).json({ error: "Resume version not found" });
            return;
        }
        if (result.kind === "conflict") {
            res.status(409).json({ error: "A resume version with this name already exists" });
            return;
        }
        res.json(result.data);
    },
    async remove(req, res) {
        const removed = await resume_version_service_1.resumeVersionService.remove(getUserId(req), getId(req));
        if (!removed) {
            res.status(404).json({ error: "Resume version not found" });
            return;
        }
        res.status(204).send();
    },
};
