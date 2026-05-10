import { Router } from "express";

import {
  getParentDashboard,
  getParentStudentAnalytics,
  getParentStudentAttendance
} from "../controllers/parentController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import { validateRequest } from "../middleware/validate.js";
import { routeIdParamSchema } from "../validation/schemas.js";
import { asyncHandler } from "../utils/http.js";

export const parentRoutes = Router();

parentRoutes.use(authMiddleware, requireRole("parent"));
parentRoutes.get("/dashboard", asyncHandler(getParentDashboard));
parentRoutes.get("/student/:id/attendance", validateRequest({ params: routeIdParamSchema }), asyncHandler(getParentStudentAttendance));
parentRoutes.get("/student/:id/analytics", validateRequest({ params: routeIdParamSchema }), asyncHandler(getParentStudentAnalytics));
