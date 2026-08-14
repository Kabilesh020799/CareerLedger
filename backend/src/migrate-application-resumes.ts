import { prisma } from "./config/prisma";
import { applicationResumeStorageService } from "./services/application-resume-storage.service";

async function main() {
  const result = await applicationResumeStorageService.migrateLegacyAttachments();
  console.log(
    `Resume storage migration completed: ${result.migrated} migrated, ${result.skipped} skipped, ${result.failed} deferred.`,
  );
}

main()
  .catch(() => {
    console.error("Resume storage migration could not be completed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
