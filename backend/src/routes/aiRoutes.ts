import { Router } from "express";

import { askDoubt } from "../controllers/aiController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import { validateRequest } from "../middleware/validate.js";
import { askDoubtSchema } from "../validation/schemas.js";
import { asyncHandler } from "../utils/http.js";

export const aiRoutes = Router();

aiRoutes.post("/ask-doubt", authMiddleware, requireRole("student"), validateRequest({ body: askDoubtSchema }), asyncHandler(askDoubt));
