import { Router } from "express";

import { adminRoutes } from "./adminRoutes.js";
import { aiRoutes } from "./aiRoutes.js";
import { attendanceRoutes } from "./attendanceRoutes.js";
import { authRoutes } from "./authRoutes.js";
import { feeRoutes } from "./feeRoutes.js";
import { notificationRoutes } from "./notificationRoutes.js";
import { parentRoutes } from "./parentRoutes.js";
import { scheduleRoutes } from "./scheduleRoutes.js";
import { studentRoutes } from "./studentRoutes.js";
import { teacherRoutes } from "./teacherRoutes.js";
import { uploadRoutes } from "./uploadRoutes.js";

export const apiRouter = Router();

apiRouter.use(authRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/attendance", attendanceRoutes);
apiRouter.use("/teacher", teacherRoutes);
apiRouter.use("/student", studentRoutes);
apiRouter.use("/parent", parentRoutes);
apiRouter.use(aiRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/schedules", scheduleRoutes);
apiRouter.use("/fees", feeRoutes);

apiRouter.use("/uploads", uploadRoutes);
