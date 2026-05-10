import path from "node:path";

import type multer from "multer";

import { env } from "../../config/env.js";
import { ApiError } from "../../utils/http.js";
import { logger } from "../ops/logger.js";

const allowedExtensionsByCategory: Record<"images" | "audio", string[]> = {
  images: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"],
  audio: [".mp3", ".wav", ".ogg", ".m4a", ".webm", ".mp4", ".mpeg"]
};

export async function assertUploadSafety(
  file: Express.Multer.File,
  category: "images" | "audio"
): Promise<void> {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensionsByCategory[category].includes(extension)) {
    throw new ApiError(400, `Unsupported file extension: ${extension || "unknown"}.`);
  }

  if (!env.enableUploadMalwareScanHook) {
    return;
  }

  if (!env.uploadMalwareScanEndpoint) {
    throw new ApiError(503, "Upload scanning is required but not configured.");
  }

  logger.info("Upload malware scan hook invoked.", {
    category,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  });
}
