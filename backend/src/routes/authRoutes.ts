import { Router } from "express";

import {
  forgotPassword,
  login,
  logout,
  me,
  resetPassword,
  setupPassword
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";
import { loginRateLimiter } from "../middleware/rateLimit.js";
import { validateRequest } from "../middleware/validate.js";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, setupPasswordSchema } from "../validation/schemas.js";
import { asyncHandler } from "../utils/http.js";

export const authRoutes = Router();

authRoutes.post("/login", loginRateLimiter, validateRequest({ body: loginSchema }), asyncHandler(login));
authRoutes.post("/logout", authMiddleware, asyncHandler(logout));
authRoutes.get("/me", authMiddleware, asyncHandler(me));
authRoutes.post("/auth/login", loginRateLimiter, validateRequest({ body: loginSchema }), asyncHandler(login));
authRoutes.post("/auth/logout", authMiddleware, asyncHandler(logout));
authRoutes.get("/auth/me", authMiddleware, asyncHandler(me));
authRoutes.post("/auth/setup-password", validateRequest({ body: setupPasswordSchema }), asyncHandler(setupPassword));
authRoutes.post("/auth/forgot-password", validateRequest({ body: forgotPasswordSchema }), asyncHandler(forgotPassword));
authRoutes.post("/auth/reset-password", validateRequest({ body: resetPasswordSchema }), asyncHandler(resetPassword));
