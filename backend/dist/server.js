"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const application_resume_storage_service_1 = require("./services/application-resume-storage.service");
const port = Number(process.env.PORT) || 3000;
(0, app_1.createApp)().listen(port, () => {
    console.log(`Server running on port ${port}`);
    void application_resume_storage_service_1.applicationResumeStorageService.retryQueuedDeletions().catch(() => {
        console.error("Unable to retry pending resume object deletions");
    });
});
