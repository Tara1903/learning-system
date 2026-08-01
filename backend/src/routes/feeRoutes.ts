import { Router } from "express";
import { createFeeRecord, getFees, recordPayment } from "../controllers/feeController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import { asyncHandler } from "../utils/http.js";

export const feeRoutes = Router();

feeRoutes.use(authMiddleware);

// All authenticated users can fetch fees (controller filters by role)
feeRoutes.get("/", asyncHandler(getFees));

// Only admins can create fee dues and record payments
feeRoutes.post("/", requireRole("admin"), asyncHandler(createFeeRecord));
feeRoutes.post("/:id/pay", requireRole("admin"), asyncHandler(recordPayment));
