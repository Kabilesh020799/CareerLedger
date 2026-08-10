import { createApp } from "./app";
import { applicationResumeStorageService } from "./services/application-resume-storage.service";
import { gmailSyncQueueService } from "./services/gmail-sync-queue.service";
import { notificationQueueService } from "./services/notification-queue.service";

const port = Number(process.env.PORT) || 3000;

createApp().listen(port, () => {
  console.log(`Server running on port ${port}`);
  void applicationResumeStorageService.retryQueuedDeletions().catch(() => {
    console.error("Unable to retry pending resume object deletions");
  });
  if (process.env.DISABLE_BACKGROUND_JOBS !== "true") {
    void gmailSyncQueueService.reconcile().catch(() => {
      console.error("Unable to reconcile automatic Gmail schedules");
    });
    void notificationQueueService.schedule().catch(() => {
      console.error("Unable to schedule reminder notification delivery");
    });
  }
});
