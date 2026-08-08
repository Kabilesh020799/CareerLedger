"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationController = void 0;
const application_service_1 = require("../services/application.service");
const application_validator_1 = require("../validators/application.validator");
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
    async create(req, res) {
        const parsed = application_validator_1.createApplicationSchema.safeParse(req.body);
        if (!parsed.success)
            return validationError(res, parsed.error.flatten());
        const application = await application_service_1.applicationService.create(getUserId(req), parsed.data);
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
    async update(req, res) {
        const parsed = application_validator_1.updateApplicationSchema.safeParse(req.body);
        if (!parsed.success)
            return validationError(res, parsed.error.flatten());
        const application = await application_service_1.applicationService.update(getUserId(req), getId(req), parsed.data);
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
