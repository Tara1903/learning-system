import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { isProduction } from "../config/env.js";
import { logger } from "../services/ops/logger.js";
import { ApiError } from "../utils/http.js";

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const details = error instanceof ApiError ? error.details : undefined;
  const code = error instanceof ApiError ? error.code : undefined;
  const errorId = req.requestId ?? randomUUID();

  logger.error("HTTP request failed.", {
    requestId: errorId,
    path: req.originalUrl,
    method: req.method,
    statusCode,
    error: logger.serializeError(error)
  });

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500 && isProduction
        ? "Something went wrong."
        : error.message || "Something went wrong.",
    errorId,
    ...(code ? { code } : {}),
    ...(details ? { details } : {})
  });
}
