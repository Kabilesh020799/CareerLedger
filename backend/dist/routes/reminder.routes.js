"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderRouter = void 0;
const express_1 = require("express");
const reminder_controller_1 = require("../controllers/reminder.controller");
exports.reminderRouter = (0, express_1.Router)();
exports.reminderRouter.get("/", reminder_controller_1.reminderController.listOpen);
exports.reminderRouter.patch("/:id", reminder_controller_1.reminderController.update);
exports.reminderRouter.delete("/:id", reminder_controller_1.reminderController.remove);
