import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { supabase } from "../config/db.js";
import { ApiError } from "../utils/http.js";
import { verifyToken } from "../utils/jwt.js";

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.replace("Bearer ", "")
    : undefined;
  const token = req.cookies?.[env.cookieName] ?? bearer;

  if (!token) {
    next(new ApiError(401, "Authentication required."));
    return;
  }

  try {
    const decoded = verifyToken(token);
    const { data: user } = await supabase.from("users").select("id, name, email, role, isActive, tokenVersion").eq("id", decoded.id).maybeSingle();

    if (!user || !user.isActive || user.tokenVersion !== decoded.tokenVersion) {
      next(new ApiError(401, "Invalid or expired session.", undefined, "SESSION_REVOKED"));
      return;
    }

    req.user = {
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion
    };
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired session."));
  }
}
