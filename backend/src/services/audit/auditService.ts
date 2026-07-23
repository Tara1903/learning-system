import type { Request } from "express";

import { supabase } from '../../config/db.js';

interface AuditLogInput {
  actorId?: string;
  actorRole?: "admin" | "teacher" | "student" | "parent";
  action: string;
  entityType: string;
  entityId?: string;
  targetUserId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export async function recordAuditEvent(input: AuditLogInput): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert(input);
  if (error) console.error("Failed to record audit event:", error);
}

export async function recordAuditEventFromRequest(
  req: Request,
  input: Omit<AuditLogInput, "actorId" | "actorRole" | "ipAddress" | "userAgent" | "requestId">
): Promise<void> {
  await recordAuditEvent({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    requestId: req.requestId,
    ...input
  });
}
