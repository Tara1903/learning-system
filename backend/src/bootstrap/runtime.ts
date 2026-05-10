import { connectDatabase } from "../config/db.js";
import { logger } from "../services/ops/logger.js";
import { ensureSeedAdmin } from "../services/bootstrap/adminBootstrap.js";
import { ensureUploadDirectories } from "../services/upload/storageService.js";

let runtimeReady = false;
let runtimeInitialization: Promise<void> | null = null;

async function initializeRuntime(): Promise<void> {
  await ensureUploadDirectories();
  await connectDatabase();
  await ensureSeedAdmin();
  runtimeReady = true;
}

export async function ensureRuntimeReady(): Promise<void> {
  if (runtimeReady) {
    return;
  }

  if (!runtimeInitialization) {
    runtimeInitialization = initializeRuntime().catch((error) => {
      runtimeInitialization = null;
      runtimeReady = false;
      logger.error("Runtime initialization failed.", {
        error: logger.serializeError(error)
      });
      throw error;
    });
  }

  await runtimeInitialization;
}

export function isRuntimeReady(): boolean {
  return runtimeReady;
}
