import type { Request, Response } from "express";

import { supabase } from "../config/db.js";
import { recalculateStudentAnalytics, getStudentAnalytics } from "../services/analytics/analyticsService.js";
import { recordAuditEventFromRequest } from "../services/audit/auditService.js";
import {
  generatePracticeSet,
  listPracticeSetsForStudent,
  submitPracticeResponses
} from "../services/ai/practiceService.js";
import { generateStudentRecommendations } from "../services/ai/recommendationService.js";
import { createNotification, notifyLinkedParents } from "../services/notification/notificationService.js";
import { settleNonCriticalTasks } from "../services/ops/sideEffects.js";
import { buildUploadDownloadUrl } from "../services/upload/accessService.js";
import { ok, ApiError } from "../utils/http.js";

function serializeDoubt(thread: any) {
  return {
    id: String(thread.id),
    question: thread.question,
    subject: thread.subject,
    class: thread.class,
    mode: thread.mode,
    response: thread.response,
    weakTopicTags: thread.weakTopicTags,
    voiceTranscript: thread.voiceTranscript,
    messages: thread.messages,
    updatedAt: thread.updatedAt,
    attachments: (thread.attachments || []).map((attachment: any) => ({
      type: attachment.type,
      fileName: attachment.fileName,
      assetId: attachment.assetId ? String(attachment.assetId) : undefined,
      url: attachment.assetId ? buildUploadDownloadUrl(String(attachment.assetId)) : attachment.url
    }))
  };
}

function getStudentId(req: Request): string {
  if (!req.user?.id) {
    throw new ApiError(401, "Authentication required.");
  }

  return req.user.id;
}

export async function getStudentDashboard(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const [
    { data: student },
    analytics,
    { data: attendance },
    { data: recentDoubts },
    { count: unreadNotifications }
  ] = await Promise.all([
    supabase.from("users").select("name, class, profile").eq("id", studentId).maybeSingle(),
    getStudentAnalytics(studentId),
    supabase.from("attendance").select("*").eq("studentId", studentId).order("date", { ascending: false }).limit(10),
    supabase.from("doubts").select("*").eq("studentId", studentId).order("updatedAt", { ascending: false }).limit(5),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("recipientId", studentId).eq("read", false)
  ]);
  const recommendations = await generateStudentRecommendations(analytics);

  ok(res, {
    student,
    analytics,
    attendance: attendance || [],
    recentDoubts: (recentDoubts || []).map((doubt) => serializeDoubt(doubt)),
    unreadNotifications,
    recommendations
  });
}

export async function getStudentAttendance(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const { data: records } = await supabase.from("attendance").select("*").eq("studentId", studentId).order("date", { ascending: false });
  const analytics = await getStudentAnalytics(studentId);
  ok(res, { records: records || [], percentage: analytics.attendancePercentage });
}

export async function getStudentDoubts(req: Request, res: Response): Promise<void> {
  const { data: doubts } = await supabase.from("doubts").select("*").eq("studentId", getStudentId(req)).order("updatedAt", { ascending: false });
  ok(res, { doubts: (doubts || []).map((doubt) => serializeDoubt(doubt)) });
}

export async function getStudentPracticeSets(req: Request, res: Response): Promise<void> {
  const practiceSets = await listPracticeSetsForStudent(getStudentId(req));
  ok(res, { practiceSets });
}

export async function generateStudentPractice(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const { data: student } = await supabase.from("users").select("*").eq("id", studentId).maybeSingle();

  if (!student) {
    throw new ApiError(404, "Student not found.");
  }

  const subject = String(req.body.subject ?? "General Studies");
  const { data: analytics } = await supabase.from("analytics").select("*").eq("studentId", studentId).maybeSingle();
  const { data: recentDoubts } = await supabase.from("doubts").select("*").eq("studentId", studentId).eq("subject", subject).order("updatedAt", { ascending: false }).limit(5);
  const practiceSet = await generatePracticeSet({
    studentId,
    subject,
    studentClass: student.class ?? "12",
    analytics: analytics || {},
    recentDoubts: recentDoubts || [],
    profileWeakSubjects: student.profile?.weakSubjects
  });

  await settleNonCriticalTasks(
    "student-generate-practice",
    [
      recalculateStudentAnalytics(studentId),
      createNotification({
        recipientId: studentId,
        type: "practice-generated",
        title: "Practice set ready",
        message: `A new ${subject} practice set is ready for you.`,
        relatedEntityType: "practiceSet",
        relatedEntityId: String(practiceSet.id || practiceSet._id)
      }),
      notifyLinkedParents(
        studentId,
        "Student practice generated",
        `${student.name} generated a new ${subject} practice set.`,
        "practiceSet",
        String(practiceSet.id || practiceSet._id)
      ),
      recordAuditEventFromRequest(req, {
        action: "student.practice.generated",
        entityType: "practiceSet",
        entityId: String(practiceSet.id || practiceSet._id),
        targetUserId: studentId,
        details: {
          subject
        }
      })
    ],
    {
      studentId,
      subject
    }
  );

  ok(res, { practiceSet }, "Practice set generated.", 201);
}

export async function submitStudentPractice(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const { data: student } = await supabase.from("users").select("*").eq("id", studentId).maybeSingle();

  if (!student) {
    throw new ApiError(404, "Student not found.");
  }

  const { data: practiceSet } = await supabase.from("practice_sets").select("*").eq("id", req.params.id).eq("studentId", studentId).maybeSingle();

  if (!practiceSet) {
    throw new ApiError(404, "Practice set not found.");
  }

  const responses = Array.isArray(req.body.responses) ? req.body.responses : [];

  const reviewedPracticeSet = await submitPracticeResponses({
    practiceSetId: String(practiceSet.id),
    studentId,
    subject: practiceSet.subject,
    studentClass: student.class ?? "12",
    responses
  });

  await settleNonCriticalTasks(
    "student-submit-practice",
    [
      recalculateStudentAnalytics(studentId),
      createNotification({
        recipientId: studentId,
        type: "practice-reviewed",
        title: reviewedPracticeSet.completedAt ? "Practice completed" : "Practice progress saved",
        message: reviewedPracticeSet.completedAt
          ? `Your ${reviewedPracticeSet.subject} practice set has been reviewed.`
          : `Your ${reviewedPracticeSet.subject} practice answers were saved and reviewed.`,
        relatedEntityType: "practiceSet",
        relatedEntityId: String(reviewedPracticeSet.id || reviewedPracticeSet._id)
      }),
      notifyLinkedParents(
        studentId,
        reviewedPracticeSet.completedAt ? "Practice completed" : "Practice progress updated",
        reviewedPracticeSet.completedAt
          ? `${student.name} completed a ${reviewedPracticeSet.subject} practice set.`
          : `${student.name} updated progress on a ${reviewedPracticeSet.subject} practice set.`,
        "practiceSet",
        String(reviewedPracticeSet.id || reviewedPracticeSet._id)
      ),
      recordAuditEventFromRequest(req, {
        action: "student.practice.submitted",
        entityType: "practiceSet",
        entityId: String(reviewedPracticeSet.id || reviewedPracticeSet._id),
        targetUserId: studentId,
        details: {
          subject: reviewedPracticeSet.subject,
          completionRate: reviewedPracticeSet.completionRate,
          accuracyPercentage: reviewedPracticeSet.accuracyPercentage
        }
      })
    ],
    {
      studentId,
      practiceSetId: String(reviewedPracticeSet.id || reviewedPracticeSet._id)
    }
  );

  ok(res, { practiceSet: reviewedPracticeSet }, "Practice responses reviewed.");
}

export async function getStudentRecommendations(req: Request, res: Response): Promise<void> {
  const analytics = await getStudentAnalytics(getStudentId(req));
  ok(res, { recommendations: await generateStudentRecommendations(analytics) });
}

