"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcryptjs_1 = require("bcryptjs");
const client_1 = require("./generated/prisma/client");
const connectionString = process.env.DATABASE_URL;
const username = process.env.BOOTSTRAP_USER_USERNAME?.trim().toLowerCase();
const encodedPassword = process.env.BOOTSTRAP_USER_PASSWORD_B64;
if (!connectionString)
    throw new Error("DATABASE_URL is not configured");
if (!username)
    throw new Error("BOOTSTRAP_USER_USERNAME is not configured");
if (!encodedPassword)
    throw new Error("BOOTSTRAP_USER_PASSWORD_B64 is not configured");
const password = Buffer.from(encodedPassword, "base64").toString("utf8");
if (password.length < 12) {
    throw new Error("The bootstrap user password must contain at least 12 characters");
}
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString }),
});
async function main() {
    const passwordHash = await (0, bcryptjs_1.hash)(password, 12);
    await prisma.user.upsert({
        where: { username },
        create: {
            username,
            passwordHash,
            email: `${username}@jobtracker.invalid`,
            name: username,
        },
        update: { passwordHash },
    });
    console.log("Production user bootstrap completed.");
}
main()
    .catch((error) => {
    console.error("Production user bootstrap failed", error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
