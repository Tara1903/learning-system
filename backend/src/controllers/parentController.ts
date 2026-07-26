import type { Request, Response } from "express";

import { supabase } from "../config/db.js";
import { getStudentAnalytics, getStudentsAnalytics } from "../services/analytics/analyticsService.js";
import { recordAuditEventFromRequest } from "../services/audit/auditService.js";
import { generateParentRecommendations } from "../services/ai/recommendationService.js";
import { settleNonCriticalTasks } from "../services/ops/sideEffects.js";
import { ApiError, ok } from "../utils/http.js";

function readRouteParam(value: string | string[] | undefined, fieldName: string): string {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  return normalized;
}

async function assertParentAccess(parentId: string, studentId: string) {
  const { data: parent } = await supabase.from("users").select("*").eq("id", parentId).maybeSingle();
  const linked =
    parent?.linkedStudentId === studentId ||
    (Array.isArray(parent?.linkedStudentIds) && parent.linkedStudentIds.includes(studentId));

  if (!linked) {
    throw new ApiError(403, "Parent access denied for this student.");
  }
}

export async function getParentDashboard(req: Request, res: Response): Promise<void> {
  const { data: parent } = await supabase.from("users").select("*").eq("id", req.user?.id).maybeSingle();

  if (!parent) {
    throw new ApiError(404, "Parent not found.");
  }

  const linkedIds = [...(parent.linkedStudentId ? [parent.linkedStudentId] : []), ...(Array.isArray(parent.linkedStudentIds) ? parent.linkedStudentIds : [])]
    .map((item) => String(item))
    .filter((item): item is string => Boolean(item));

  const analyticsMap = await getStudentsAnalytics(linkedIds);
  const { data: students } = await supabase.from("users").select("id, name, class").in("id", linkedIds);
  const studentMap = new Map((students || []).map((s) => [String(s.id), s]));

  const studentSummaries = await Promise.all(
    linkedIds.map(async (studentId) => {
      const student = studentMap.get(studentId);
      const analytics = analyticsMap.get(studentId);
      return {
        id: studentId,
        name: student?.name ?? "Student",
        class: student?.class,
        analytics,
        recommendations: await generateParentRecommendations(analytics)
      };
    })
  );

  ok(res, {
    parent: {
      id: String(parent.id),
      name: parent.name,
      email: parent.email
    },
    students: studentSummaries
  });
}

export async function getParentStudentAttendance(req: Request, res: Response): Promise<void> {
  const studentId = readRouteParam(req.params.id, "Student id");
  await assertParentAccess(req.user?.id!, studentId);

  const { data: records } = await supabase.from("attendance").select("*").eq("studentId", studentId).order("date", { ascending: false });
  await settleNonCriticalTasks("parent-view-attendance-audit", [
    recordAuditEventFromRequest(req, {
      action: "parent.attendance.viewed",
      entityType: "attendance",
      targetUserId: studentId
    })
  ]);
  ok(res, { records: records ?? [] });
}

export async function getParentStudentAnalytics(req: Request, res: Response): Promise<void> {
  const studentId = readRouteParam(req.params.id, "Student id");
  await assertParentAccess(req.user?.id!, studentId);

  const analytics = await getStudentAnalytics(studentId);
  await settleNonCriticalTasks("parent-view-analytics-audit", [
    recordAuditEventFromRequest(req, {
      action: "parent.analytics.viewed",
      entityType: "analytics",
      targetUserId: studentId
    })
  ]);
  ok(res, {
    analytics,
    recommendations: await generateParentRecommendations(analytics)
  });
}
