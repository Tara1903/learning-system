import { Router } from "express";

import {
  generateStudentPractice,
  getStudentAttendance,
  getStudentDashboard,
  getStudentDoubts,
  getStudentPracticeSets,
  submitStudentPractice,
  getStudentRecommendations
} from "../controllers/studentController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import { validateRequest } from "../middleware/validate.js";
import { practiceGenerateSchema, practiceSubmitSchema, routeIdParamSchema } from "../validation/schemas.js";
import { asyncHandler } from "../utils/http.js";

export const studentRoutes = Router();

studentRoutes.use(authMiddleware, requireRole("student"));
studentRoutes.get("/dashboard", asyncHandler(getStudentDashboard));
studentRoutes.get("/attendance", asyncHandler(getStudentAttendance));
studentRoutes.get("/doubts", asyncHandler(getStudentDoubts));
studentRoutes.get("/practice", asyncHandler(getStudentPracticeSets));
studentRoutes.post("/practice/generate", validateRequest({ body: practiceGenerateSchema }), asyncHandler(generateStudentPractice));
studentRoutes.post(
  "/practice/:id/submit",
  validateRequest({ params: routeIdParamSchema, body: practiceSubmitSchema }),
  asyncHandler(submitStudentPractice)
);
studentRoutes.get("/recommendations", asyncHandler(getStudentRecommendations));
