"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("./generated/prisma/client");
const demo_user_bootstrap_service_1 = require("./services/demo-user-bootstrap.service");
const connectionString = process.env.DATABASE_URL;
if (!connectionString)
    throw new Error("DATABASE_URL is not configured");
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString }),
});
async function main() {
    await (0, demo_user_bootstrap_service_1.bootstrapBuiltInDemoUser)(prisma);
    console.log("Production user bootstrap completed.");
}
if (require.main === module) {
    main()
        .catch((error) => {
        console.error("Production user bootstrap failed", error);
        process.exitCode = 1;
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
