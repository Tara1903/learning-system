import { Router } from "express";

import { getTeacherStudents } from "../controllers/teacherController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import { asyncHandler } from "../utils/http.js";

export const teacherRoutes = Router();

teacherRoutes.use(authMiddleware, requireRole("teacher"));
teacherRoutes.get("/students", asyncHandler(getTeacherStudents));
