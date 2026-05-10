import jwt, { type SignOptions } from "jsonwebtoken";

import { env, isProduction } from "../config/env.js";
import type { AuthUser } from "../types/domain.js";

export function signToken(user: AuthUser): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
  };

  return jwt.sign(user, env.jwtSecret, options);
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, env.jwtSecret) as AuthUser;
}

export function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    domain: env.cookieDomain,
    path: "/"
  };
}
