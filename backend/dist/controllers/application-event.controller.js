"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationEventController = void 0;
const application_event_service_1 = require("../services/application-event.service");
const application_event_validator_1 = require("../validators/application-event.validator");
function getId(req) {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
}
function getUserId(req) {
    if (!req.user)
        throw new Error("Authenticated user is missing");
    return req.user.id;
}
exports.applicationEventController = {
    async list(req, res) {
        const events = await application_event_service_1.applicationEventService.list(getUserId(req), getId(req));
        if (!events) {
            res.status(404).json({ error: "Application not found" });
            return;
        }
        res.json(events);
    },
    async create(req, res) {
        const parsed = application_event_validator_1.createApplicationEventSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Invalid application event data",
                details: parsed.error.flatten(),
            });
            return;
        }
        const event = await application_event_service_1.applicationEventService.create(getUserId(req), getId(req), parsed.data);
        if (!event) {
            res.status(404).json({ error: "Application not found" });
            return;
        }
        res.status(201).json(event);
    },
};
