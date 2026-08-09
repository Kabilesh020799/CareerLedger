"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderController = void 0;
const reminder_service_1 = require("../services/reminder.service");
const reminder_validator_1 = require("../validators/reminder.validator");
function getParameter(req, name) {
    const value = req.params[name];
    return Array.isArray(value) ? value[0] : value;
}
function getUserId(req) {
    if (!req.user)
        throw new Error("Authenticated user is missing");
    return req.user.id;
}
exports.reminderController = {
    async listForApplication(req, res) {
        const reminders = await reminder_service_1.reminderService.listForApplication(getUserId(req), getParameter(req, "id"));
        if (!reminders) {
            res.status(404).json({ error: "Application not found" });
            return;
        }
        res.json(reminders);
    },
    async listOpen(req, res) {
        const reminders = await reminder_service_1.reminderService.listOpen(getUserId(req));
        res.json(reminders);
    },
    async create(req, res) {
        const parsed = reminder_validator_1.createReminderSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Invalid reminder data",
                details: parsed.error.flatten(),
            });
            return;
        }
        const reminder = await reminder_service_1.reminderService.create(getUserId(req), getParameter(req, "id"), parsed.data);
        if (!reminder) {
            res.status(404).json({ error: "Application not found" });
            return;
        }
        res.status(201).json(reminder);
    },
    async update(req, res) {
        const parsed = reminder_validator_1.updateReminderSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Invalid reminder data",
                details: parsed.error.flatten(),
            });
            return;
        }
        const reminder = await reminder_service_1.reminderService.updateCompletion(getUserId(req), getParameter(req, "id"), parsed.data.completed);
        if (!reminder) {
            res.status(404).json({ error: "Reminder not found" });
            return;
        }
        res.json(reminder);
    },
    async remove(req, res) {
        const removed = await reminder_service_1.reminderService.remove(getUserId(req), getParameter(req, "id"));
        if (!removed) {
            res.status(404).json({ error: "Reminder not found" });
            return;
        }
        res.status(204).send();
    },
};
