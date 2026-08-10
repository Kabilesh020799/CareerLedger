"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./config/prisma");
const application_resume_storage_service_1 = require("./services/application-resume-storage.service");
async function main() {
    const result = await application_resume_storage_service_1.applicationResumeStorageService.migrateLegacyAttachments();
    console.log(`Resume storage migration completed: ${result.migrated} migrated, ${result.skipped} skipped, ${result.failed} deferred.`);
}
main()
    .catch(() => {
    console.error("Resume storage migration could not be completed");
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
