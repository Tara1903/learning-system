import multer from "multer";

import { ApiError } from "../utils/http.js";

const memoryStorage = multer.memoryStorage();

function buildFileFilter(allowedMimePrefixes: string[]) {
  return (_req: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback): void => {
    const allowed = allowedMimePrefixes.some((prefix) => file.mimetype.startsWith(prefix));
    if (!allowed) {
      callback(new ApiError(400, `Unsupported file type: ${file.mimetype}`));
      return;
    }
    callback(null, true);
  };
}

export const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: buildFileFilter(["image/"])
});

export const audioUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: buildFileFilter(["audio/", "video/"])
});

