import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { bootstrapBuiltInDemoUsers } from "./services/demo-user-bootstrap.service";
import { logger } from "./config/logger";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is not configured");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await bootstrapBuiltInDemoUsers(prisma);

  logger.info("production user bootstrap completed");
}

if (require.main === module) {
  main()
    .catch((error: unknown) => {
      logger.error({ err: error }, "production user bootstrap failed");
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
