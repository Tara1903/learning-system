import { Router } from "express";

import {
  getAttendanceByClass,
  getAttendanceByStudent,
  markAttendance
} from "../controllers/attendanceController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import { validateRequest } from "../middleware/validate.js";
import { attendanceByClassQuerySchema, attendanceMarkSchema, routeIdParamSchema } from "../validation/schemas.js";
import { asyncHandler } from "../utils/http.js";

export const attendanceRoutes = Router();

attendanceRoutes.use(authMiddleware);
attendanceRoutes.post(
  "/mark",
  requireRole("teacher"),
  validateRequest({ body: attendanceMarkSchema }),
  asyncHandler(markAttendance)
);
attendanceRoutes.get(
  "/class/:class",
  requireRole("teacher"),
  validateRequest({ query: attendanceByClassQuerySchema }),
  asyncHandler(getAttendanceByClass)
);
attendanceRoutes.get(
  "/student/:id",
  requireRole("teacher", "student", "parent"),
  validateRequest({ params: routeIdParamSchema }),
  asyncHandler(getAttendanceByStudent)
);
