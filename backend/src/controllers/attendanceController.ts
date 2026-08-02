import type { Request, Response } from "express";

import { supabase } from "../config/db.js";
import { recalculateStudentAnalytics } from "../services/analytics/analyticsService.js";
import { recordAuditEventFromRequest } from "../services/audit/auditService.js";
import { createNotification, notifyLinkedParents } from "../services/notification/notificationService.js";
import { settleNonCriticalTasks } from "../services/ops/sideEffects.js";
import type { AttendanceStatus } from "../types/domain.js";
import { normalizeAttendanceDateInput } from "../utils/attendance.js";
import { ApiError, ok } from "../utils/http.js";

interface AttendanceRecordPayload {
  studentId: string;
  class: string;
  date: string;
  status: AttendanceStatus;
}

function readRouteParam(value: string | string[] | undefined, fieldName: string): string {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  return normalized;
}

function parseAttendanceDate(input: string): Date {
  try {
    return normalizeAttendanceDateInput(input);
  } catch {
    throw new ApiError(400, "Attendance date must use a valid YYYY-MM-DD value.");
  }
}

function calculateAttendancePercentage(records: Array<{ status: AttendanceStatus }>): number {
  if (!records.length) {
    return 0;
  }

  const present = records.filter((record) => record.status !== "absent").length;
  return Number(((present / records.length) * 100).toFixed(2));
}

async function assertParentAccess(parentId: string, studentId: string) {
  const { data: parent } = await supabase.from('users').select('linked_student_id, linked_student_ids').eq('id', parentId).single();
  const linked =
    parent?.linked_student_id?.toString() === studentId ||
    (parent?.linked_student_ids || []).some((id: { toString(): string }) => id.toString() === studentId);

  if (!linked) {
    throw new ApiError(403, "Parent access denied for this student.");
  }
}

export async function markAttendance(req: Request, res: Response): Promise<void> {
  const payload = req.body as AttendanceRecordPayload | { records: AttendanceRecordPayload[] };
  const records = Array.isArray((payload as { records?: AttendanceRecordPayload[] }).records)
    ? (payload as { records: AttendanceRecordPayload[] }).records
    : [payload as AttendanceRecordPayload];

  if (!records.length) {
    throw new ApiError(400, "At least one attendance record is required.");
  }

  const results = await Promise.all(
    records.map(async (record) => {
      if (!record.studentId || !record.class || !record.date || !record.status) {
        throw new ApiError(400, "Attendance record is incomplete.");
      }

      const normalizedDate = parseAttendanceDate(record.date);
      const { data: attendance, error } = await supabase.from('attendance').upsert({
          student_id: record.studentId,
          class: record.class,
          date: normalizedDate.toISOString(),
          status: record.status,
          marked_by: req.user?.id
      }, { onConflict: 'student_id, date' }).select().single();
      if (error) throw new ApiError(500, error.message);

      await settleNonCriticalTasks(
        "mark-attendance-side-effects",
        [
          recalculateStudentAnalytics(record.studentId),
          createNotification({
            recipientId: record.studentId,
            type: "attendance-marked",
            title: "Attendance updated",
            message: `Your attendance for ${record.class} was marked as ${record.status}.`,
            relatedEntityType: "attendance",
            relatedEntityId: attendance.id
          }),
          notifyLinkedParents(
            record.studentId,
            "Attendance updated",
            `Attendance was marked as ${record.status} for ${record.class}.`,
            "attendance",
            attendance.id
          ),
          recordAuditEventFromRequest(req, {
            action: "attendance.marked",
            entityType: "attendance",
            entityId: attendance.id,
            targetUserId: record.studentId,
            details: {
              class: record.class,
              date: record.date,
              status: record.status
            }
          })
        ],
        {
          studentId: record.studentId
        }
      );

      return attendance;
    })
  );

  ok(res, { records: results }, "Attendance marked successfully.", 201);
}

export async function getAttendanceByClass(req: Request, res: Response): Promise<void> {
  const className = req.params.class;
  const dateStr = req.query.date ? parseAttendanceDate(String(req.query.date)).toISOString() : undefined;

  let query = supabase.from('attendance').select('*, student:users(name, class)').eq('class', className);
  if (dateStr) query = query.eq('date', dateStr);
  const { data: records } = await query;

  ok(res, { records });
}

export async function getAttendanceByStudent(req: Request, res: Response): Promise<void> {
  const studentId = readRouteParam(req.params.id, "Student id");

  if (req.user?.role === "student" && req.user.id !== studentId) {
    throw new ApiError(403, "Students can only view their own attendance.");
  }

  if (req.user?.role === "parent") {
    await assertParentAccess(req.user.id, studentId);
  }

  const { data: records = [] } = await supabase.from('attendance').select('*').eq('studentId', studentId).order('date', { ascending: false });
  const percentage = calculateAttendancePercentage(records as any);

  await settleNonCriticalTasks("attendance-view-audit", [
    recordAuditEventFromRequest(req, {
      action: "attendance.viewed",
      entityType: "attendance",
      targetUserId: studentId,
      details: {
        viewerRole: req.user?.role
      }
    })
  ]);

  ok(res, { records, percentage });
}
