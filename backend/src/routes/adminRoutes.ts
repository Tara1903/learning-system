import { Router } from "express";

import {
  createParent,
  createStudent,
  createTeacher,
  getAdminAnalytics,
  getStudents,
  getUsers,
  updateUser,
  updateUserStatus
} from "../controllers/adminController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import { validateRequest } from "../middleware/validate.js";
import { adminUserQuerySchema, createParentSchema, createStudentSchema, createTeacherSchema, routeIdParamSchema, updateUserSchema, updateUserStatusSchema } from "../validation/schemas.js";
import { asyncHandler } from "../utils/http.js";

export const adminRoutes = Router();

adminRoutes.use(authMiddleware, requireRole("admin"));
adminRoutes.post("/create-student", validateRequest({ body: createStudentSchema }), asyncHandler(createStudent));
adminRoutes.post("/create-teacher", validateRequest({ body: createTeacherSchema }), asyncHandler(createTeacher));
adminRoutes.post("/create-parent", validateRequest({ body: createParentSchema }), asyncHandler(createParent));
adminRoutes.get("/students", validateRequest({ query: adminUserQuerySchema }), asyncHandler(getStudents));
adminRoutes.get("/users", validateRequest({ query: adminUserQuerySchema }), asyncHandler(getUsers));
adminRoutes.patch("/users/:id", validateRequest({ params: routeIdParamSchema, body: updateUserSchema }), asyncHandler(updateUser));
adminRoutes.patch(
  "/users/:id/status",
  validateRequest({ params: routeIdParamSchema, body: updateUserStatusSchema }),
  asyncHandler(updateUserStatus)
);
adminRoutes.get("/analytics", asyncHandler(getAdminAnalytics));
