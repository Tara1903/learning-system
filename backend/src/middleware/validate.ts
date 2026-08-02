import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";

import { ApiError } from "../utils/http.js";

interface ValidationConfig {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue: { path: PropertyKey[]; message: string }) => ({
    path: issue.path.map((part) => String(part)).join("."),
    message: issue.message
  }));
}

export function validateRequest(config: ValidationConfig) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (config.params) {
        Object.defineProperty(req, "params", { value: config.params.parse(req.params), writable: true, configurable: true, enumerable: true });
      }

      if (config.query) {
        Object.defineProperty(req, "query", { value: config.query.parse(req.query), writable: true, configurable: true, enumerable: true });
      }

      if (config.body) {
        Object.defineProperty(req, "body", { value: config.body.parse(req.body), writable: true, configurable: true, enumerable: true });
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ApiError(400, "Request validation failed.", formatZodError(error)));
        return;
      }

      next(error);
    }
  };
}
