import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { logger } from "../services/ops/logger.js";

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  req.requestId = randomUUID();
  res.setHeader("x-request-id", req.requestId);

  res.on("finish", () => {
    logger.info("HTTP request completed.", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.id
    });
  });

  next();
}
