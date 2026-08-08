"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordLoginSchema = void 0;
const zod_1 = require("zod");
exports.passwordLoginSchema = zod_1.z.object({
    username: zod_1.z.string().trim().min(1, "Username is required").max(64),
    password: zod_1.z.string().min(1, "Password is required").max(256),
});
