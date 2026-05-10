import type { Request, Response } from "express";

import { AttendanceModel } from "../models/Attendance.js";
import { UserModel } from "../models/User.js";
import { getStudentAnalytics } from "../services/analytics/analyticsService.js";
import { recordAuditEventFromRequest } from "../services/audit/auditService.js";
import { generateParentRecommendations } from "../services/ai/recommendationService.js";
import { settleNonCriticalTasks } from "../services/ops/sideEffects.js";
import { ApiError, ok } from "../utils/http.js";

interface StudentReference {
  _id?: { toString(): string };
  toString(): string;
}

function readRouteParam(value: string | string[] | undefined, fieldName: string): string {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  return normalized;
}

function extractStudentId(reference: StudentReference | null | undefined): string | null {
  if (!reference) {
    return null;
  }

  return reference._id?.toString() ?? reference.toString();
}

async function assertParentAccess(parentId: string, studentId: string) {
  const parent = await UserModel.findById(parentId);
  const linked =
    parent?.linkedStudentId?.toString() === studentId ||
    parent?.linkedStudentIds.some((id: { toString(): string }) => id.toString() === studentId);

  if (!linked) {
    throw new ApiError(403, "Parent access denied for this student.");
  }
}

export async function getParentDashboard(req: Request, res: Response): Promise<void> {
  const parent = await UserModel.findById(req.user?.id).populate("linkedStudentIds", "name class");

  if (!parent) {
    throw new ApiError(404, "Parent not found.");
  }

  const linkedIds = [...(parent.linkedStudentId ? [parent.linkedStudentId] : []), ...parent.linkedStudentIds]
    .map((item) => extractStudentId(item as StudentReference))
    .filter((item): item is string => Boolean(item));

  const analytics = await Promise.all(linkedIds.map((studentId) => getStudentAnalytics(studentId)));

  const studentSummaries = await Promise.all(
    linkedIds.map(async (studentId, index) => {
      const student = await UserModel.findById(studentId).select("name class");
      return {
        id: studentId,
        name: student?.name ?? "Student",
        class: student?.class,
        analytics: analytics[index],
        recommendations: await generateParentRecommendations(analytics[index])
      };
    })
  );

  ok(res, {
    parent: {
      id: String(parent._id),
      name: parent.name,
      email: parent.email
    },
    students: studentSummaries
  });
}

export async function getParentStudentAttendance(req: Request, res: Response): Promise<void> {
  const studentId = readRouteParam(req.params.id, "Student id");
  await assertParentAccess(req.user?.id!, studentId);

  const records = await AttendanceModel.find({ studentId }).sort({ date: -1 });
  await settleNonCriticalTasks("parent-view-attendance-audit", [
    recordAuditEventFromRequest(req, {
      action: "parent.attendance.viewed",
      entityType: "attendance",
      targetUserId: studentId
    })
  ]);
  ok(res, { records });
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
