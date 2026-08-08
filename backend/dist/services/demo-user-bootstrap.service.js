"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapBuiltInDemoUser = bootstrapBuiltInDemoUser;
const bcryptjs_1 = require("bcryptjs");
const demo_user_1 = require("../config/demo-user");
async function bootstrapBuiltInDemoUser(database, passwordHasher = bcryptjs_1.hash) {
    const { username, password } = demo_user_1.builtInDemoUser;
    const passwordHash = await passwordHasher(password, 12);
    await database.user.upsert({
        where: { username },
        create: {
            username,
            passwordHash,
            email: `${username}@jobtracker.invalid`,
            name: username,
        },
        update: { passwordHash },
    });
}
