import mongoose, { Schema } from "mongoose";

import type { UserRole } from "../types/domain.js";

export interface AuditLogDocument extends mongoose.Document {
  actorId?: mongoose.Types.ObjectId;
  actorRole?: UserRole;
  action: string;
  entityType: string;
  entityId?: string;
  targetUserId?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorRole: {
      type: String,
      enum: ["admin", "teacher", "student", "parent"]
    },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, trim: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    ipAddress: String,
    userAgent: String,
    requestId: String,
    details: Schema.Types.Mixed
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel =
  mongoose.models.AuditLog || mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);
