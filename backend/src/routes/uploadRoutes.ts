import { Router } from "express";

import { downloadUploadAsset, uploadDoubtImage, uploadVoiceNote } from "../controllers/uploadController.js";
import { authMiddleware } from "../middleware/auth.js";
import { uploadRateLimiter } from "../middleware/rateLimit.js";
import { imageUpload, audioUpload } from "../middleware/upload.js";
import { requireRole } from "../middleware/roleCheck.js";
import { validateRequest } from "../middleware/validate.js";
import { routeIdParamSchema } from "../validation/schemas.js";
import { asyncHandler } from "../utils/http.js";

export const uploadRoutes = Router();

uploadRoutes.use(authMiddleware);
uploadRoutes.get("/:id/download", validateRequest({ params: routeIdParamSchema }), asyncHandler(downloadUploadAsset));
uploadRoutes.post("/doubt-image", requireRole("student", "teacher", "admin"), uploadRateLimiter, imageUpload.single("file"), asyncHandler(uploadDoubtImage));
uploadRoutes.post("/voice", requireRole("student", "teacher", "admin"), uploadRateLimiter, audioUpload.single("file"), asyncHandler(uploadVoiceNote));
