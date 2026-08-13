import { createApp } from "./app";
import { applicationResumeStorageService } from "./services/application-resume-storage.service";
import { gmailSyncQueueService } from "./services/gmail-sync-queue.service";
import { notificationQueueService } from "./services/notification-queue.service";
import { logger } from "./config/logger";

const port = Number(process.env.PORT) || 3000;

createApp().listen(port, () => {
  logger.info({ port }, "server running");
  void applicationResumeStorageService.retryQueuedDeletions().catch((error) => {
    logger.error({ err: error }, "unable to retry pending resume object deletions");
  });
  if (process.env.DISABLE_BACKGROUND_JOBS !== "true") {
    void gmailSyncQueueService.reconcile().catch((error) => {
      logger.error({ err: error }, "unable to reconcile automatic Gmail schedules");
    });
    void notificationQueueService.schedule().catch((error) => {
      logger.error({ err: error }, "unable to schedule reminder notification delivery");
    });
  }
});
