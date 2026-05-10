import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "../types/domain.js";
import { ApiError } from "../utils/http.js";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, "Authentication required."));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, "You do not have access to this resource."));
      return;
    }

    next();
  };
}

