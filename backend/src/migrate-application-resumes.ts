import { prisma } from "./config/prisma";
import { applicationResumeStorageService } from "./services/application-resume-storage.service";
import { logger } from "./config/logger";

async function main() {
  const result = await applicationResumeStorageService.migrateLegacyAttachments();
  logger.info(result, "resume storage migration completed");
}

main()
  .catch((error: unknown) => {
    logger.error({ err: error }, "resume storage migration could not be completed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
