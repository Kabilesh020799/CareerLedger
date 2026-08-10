"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadApplicationResume = uploadApplicationResume;
const multer_1 = __importDefault(require("multer"));
const application_resume_validator_1 = require("../validators/application-resume.validator");
const resumeUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: application_resume_validator_1.applicationResumeMaxBytes,
        files: 1,
    },
});
function uploadApplicationResume(req, res, next) {
    resumeUpload.single("resume")(req, res, (error) => {
        if (!error) {
            next();
            return;
        }
        if (error instanceof multer_1.default.MulterError) {
            const message = error.code === "LIMIT_FILE_SIZE"
                ? "Resume must be 5 MB or smaller"
                : "Unable to upload resume";
            res.status(400).json({ error: message });
            return;
        }
        next(error);
    });
}
