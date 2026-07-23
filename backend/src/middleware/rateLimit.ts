import { rateLimit, type RateLimitRequestHandler } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

import { ApiError } from "../utils/http.js";

function createLimiter(windowMs: number, limit: number, message: string): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(new ApiError(429, message, undefined, "RATE_LIMITED"));
    }
  });
}

export const generalApiRateLimiter = createLimiter(15 * 60 * 1000, 400, "Too many requests. Please try again shortly.");
export const loginRateLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please wait before trying again."
);
export const uploadRateLimiter = createLimiter(
  10 * 60 * 1000,
  30,
  "Too many uploads in a short time. Please wait and try again."
);
