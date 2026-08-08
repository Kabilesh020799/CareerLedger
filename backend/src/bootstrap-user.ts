import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { bootstrapBuiltInDemoUser } from "./services/demo-user-bootstrap.service";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is not configured");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await bootstrapBuiltInDemoUser(prisma);

  console.log("Production user bootstrap completed.");
}

if (require.main === module) {
  main()
    .catch((error: unknown) => {
      console.error("Production user bootstrap failed", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
