import app from "./index.js";
import { ensureRuntimeReady } from "./bootstrap/runtime.js";
import { disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./services/ops/logger.js";

async function start() {
  await ensureRuntimeReady();

  const server = app.listen(env.port, () => {
    logger.info("Adhyayan backend started.", {
      port: env.port,
      nodeEnv: env.nodeEnv
    });
  });

  const shutdown = async (signal: string) => {
    logger.info("Shutdown signal received.", { signal });
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((error) => {
  logger.error("Failed to start backend.", {
    error: logger.serializeError(error)
  });
  process.exit(1);
});
