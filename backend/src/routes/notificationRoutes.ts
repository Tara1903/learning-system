import { Router } from "express";

import { getNotifications, markNotificationRead } from "../controllers/notificationController.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { notificationsQuerySchema, routeIdParamSchema } from "../validation/schemas.js";
import { asyncHandler } from "../utils/http.js";

export const notificationRoutes = Router();

notificationRoutes.use(authMiddleware);
notificationRoutes.get("/", validateRequest({ query: notificationsQuerySchema }), asyncHandler(getNotifications));
notificationRoutes.patch("/:id/read", validateRequest({ params: routeIdParamSchema }), asyncHandler(markNotificationRead));
