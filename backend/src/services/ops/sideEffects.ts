import { logger } from "./logger.js";

export async function settleNonCriticalTasks(
  label: string,
  tasks: Promise<unknown>[],
  context?: Record<string, unknown>
): Promise<void> {
  const results = await Promise.allSettled(tasks);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.warn(`Non-critical task failed: ${label}`, {
        ...context,
        taskIndex: index,
        error: logger.serializeError(result.reason)
      });
    }
  });
}
