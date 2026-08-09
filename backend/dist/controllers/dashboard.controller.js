"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
function getUserId(req) {
    if (!req.user)
        throw new Error("Authenticated user is missing");
    return req.user.id;
}
exports.dashboardController = {
    async summary(req, res) {
        const summary = await dashboard_service_1.dashboardService.getSummary(getUserId(req));
        res.json(summary);
    },
};
