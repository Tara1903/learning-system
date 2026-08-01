import { Router } from "express";
import { createSchedule, deleteSchedule, getSchedules } from "../controllers/scheduleController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import { asyncHandler } from "../utils/http.js";

export const scheduleRoutes = Router();

scheduleRoutes.use(authMiddleware);

// All authenticated users can fetch schedules (controller filters by role)
scheduleRoutes.get("/", asyncHandler(getSchedules));

// Only admins (and maybe teachers) can manage schedules
scheduleRoutes.post("/", requireRole("admin"), asyncHandler(createSchedule));
scheduleRoutes.delete("/:id", requireRole("admin"), asyncHandler(deleteSchedule));
