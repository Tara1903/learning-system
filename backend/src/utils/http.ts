import type { NextFunction, Request, RequestHandler, Response } from "express";

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;
  code?: string;

  constructor(statusCode: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
}

export function asyncHandler<T extends RequestHandler>(fn: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
}

export function ok<T>(res: Response, data: T, message?: string, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
}
