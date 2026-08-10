import { createApp } from "./app";
import { applicationResumeStorageService } from "./services/application-resume-storage.service";
import { gmailSyncQueueService } from "./services/gmail-sync-queue.service";

const port = Number(process.env.PORT) || 3000;

createApp().listen(port, () => {
  console.log(`Server running on port ${port}`);
  void applicationResumeStorageService.retryQueuedDeletions().catch(() => {
    console.error("Unable to retry pending resume object deletions");
  });
  void gmailSyncQueueService.reconcile().catch(() => {
    console.error("Unable to reconcile automatic Gmail schedules");
  });
});
