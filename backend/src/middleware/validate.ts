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
        req.params = config.params.parse(req.params) as any;
      }

      if (config.query) {
        req.query = config.query.parse(req.query) as any;
      }

      if (config.body) {
        req.body = config.body.parse(req.body);
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
