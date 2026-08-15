"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapConfiguredDemoUsers = bootstrapConfiguredDemoUsers;
const bcryptjs_1 = require("bcryptjs");
const demo_user_1 = require("../config/demo-user");
async function bootstrapConfiguredDemoUsers(database, passwordHasher = bcryptjs_1.hash) {
    for (const { username, password, email, name } of demo_user_1.configuredDemoUsers) {
        const passwordHash = await passwordHasher(password, 12);
        await database.user.upsert({
            where: { username },
            create: {
                username,
                passwordHash,
                email,
                name,
            },
            update: { passwordHash, email, name },
        });
    }
}
