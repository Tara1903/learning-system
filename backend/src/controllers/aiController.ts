import type { Request, Response } from "express";

import { supabase } from "../config/db.js";
export interface DoubtMessage {
  role: string;
  content: string;
  mode?: string;
  createdAt?: Date | string;
}
import { recalculateStudentAnalytics } from "../services/analytics/analyticsService.js";
import { recordAuditEventFromRequest } from "../services/audit/auditService.js";
import { logger } from "../services/ops/logger.js";
import { generateTeacherGuidance } from "../services/ai/teacherGuideService.js";
import { createNotification, notifyLinkedParents } from "../services/notification/notificationService.js";
import { settleNonCriticalTasks } from "../services/ops/sideEffects.js";
import { assertUserCanAccessUpload, buildUploadDownloadUrl } from "../services/upload/accessService.js";
import { readUploadedAsset } from "../services/upload/storageService.js";
import type { DoubtMode } from "../types/domain.js";
import { ApiError, ok } from "../utils/http.js";

function inferAttachmentType(mimeType: string): "image" | "audio" {
  return mimeType.startsWith("audio/") || mimeType.startsWith("video/") ? "audio" : "image";
}

export async function askDoubt(req: Request, res: Response): Promise<void> {
  const studentId = req.user?.id;
  const {
    question,
    studentClass,
    subject,
    mode,
    threadId,
    attachmentAssetId,
    attachmentUrl,
    voiceTranscript
  } = req.body as {
    question?: string;
    studentClass?: string;
    subject?: string;
    mode?: DoubtMode;
    threadId?: string;
    attachmentAssetId?: string;
    attachmentUrl?: string;
    voiceTranscript?: string;
  };

  if (!studentId || !question || !studentClass || !subject || !mode) {
    throw new ApiError(400, "question, studentClass, subject, and mode are required.");
  }

  const { data: student } = await supabase.from('users').select('*').eq('id', studentId).single();
  if (!student) {
    throw new ApiError(404, "Student not found.");
  }

  let attachmentAsset: any = null;
  if (attachmentAssetId) {
    const { data } = await supabase.from('upload_assets').select('*').eq('id', attachmentAssetId).single();
    attachmentAsset = data;
  }
  if (attachmentAsset && req.user) {
    await assertUserCanAccessUpload(req.user, attachmentAsset);
  }

  const attachmentDownloadUrl = attachmentAsset ? buildUploadDownloadUrl(attachmentAsset.id) : attachmentUrl;
  let aiAttachment: { bytes: Buffer; mimeType: string; fileName: string } | undefined;

  if (attachmentAsset?.category === "images") {
    try {
      const storedFile = await readUploadedAsset(attachmentAsset);
      aiAttachment = {
        bytes: storedFile.bytes,
        mimeType: storedFile.mimeType,
        fileName: storedFile.fileName
      };
    } catch (error) {
      logger.warn("Image attachment could not be loaded for AI multimodal guidance.", {
        attachmentAssetId,
        error: logger.serializeError(error)
      });
    }
  }

  let thread: any = null;
  if (threadId) {
    const { data } = await supabase.from('doubts').select('*').eq('id', threadId).eq('student_id', studentId).single();
    thread = data;
  }
  const previousMessages =
    (thread?.messages || []).slice(-4).map((message: DoubtMessage) => `${message.role}: ${message.content}`) ?? [];

  const guidance = await generateTeacherGuidance({
    question,
    subject,
    studentClass,
    mode,
    voiceTranscript,
    attachmentUrl: attachmentDownloadUrl,
    attachment: aiAttachment,
    previousMessages
  });

  if (!thread) {
    const { data } = await supabase.from('doubts').insert({
      student_id: studentId,
      question,
      subject,
      class: studentClass,
      response: guidance.reply,
      mode,
      attachments:
        attachmentAsset && attachmentDownloadUrl
          ? [
              {
                type: inferAttachmentType(attachmentAsset.mime_type || attachmentAsset.mimeType),
                url: attachmentDownloadUrl,
                fileName: attachmentAsset.original_file_name || attachmentAsset.originalFileName || attachmentAsset.file_name || attachmentAsset.fileName,
                assetId: attachmentAsset.id
              }
            ]
          : attachmentUrl
            ? [
                {
                  type: "image",
                  url: attachmentUrl,
                  fileName: attachmentUrl.split("/").pop() ?? "attachment"
                }
              ]
            : [],
      voice_transcript: voiceTranscript,
      weak_topic_tags: guidance.weakTopicTags,
      messages: [
        {
          role: "student",
          content: voiceTranscript ? `${question}\nVoice transcript: ${voiceTranscript}` : question,
          mode,
          createdAt: new Date().toISOString()
        },
        {
          role: "assistant",
          content: guidance.reply,
          mode,
          createdAt: new Date().toISOString()
        }
      ],
      resolved_at: mode === "reveal-answer" ? new Date().toISOString() : null
    }).select().single();
    thread = data;
  } else {
    thread.question = question;
    thread.subject = subject;
    thread.class = studentClass;
    thread.response = guidance.reply;
    thread.mode = mode;
    thread.voice_transcript = voiceTranscript ?? thread.voice_transcript ?? thread.voiceTranscript;
    thread.weak_topic_tags = Array.from(new Set([...(thread.weak_topic_tags || thread.weakTopicTags || []), ...guidance.weakTopicTags]));
    if (attachmentAsset && attachmentDownloadUrl) {
      if (!thread.attachments) thread.attachments = [];
      thread.attachments.push({
        type: inferAttachmentType(attachmentAsset.mime_type || attachmentAsset.mimeType),
        url: attachmentDownloadUrl,
        fileName: attachmentAsset.original_file_name || attachmentAsset.originalFileName || attachmentAsset.file_name || attachmentAsset.fileName,
        assetId: attachmentAsset.id
      });
    } else if (attachmentUrl) {
      if (!thread.attachments) thread.attachments = [];
      thread.attachments.push({
        type: "image",
        url: attachmentUrl,
        fileName: attachmentUrl.split("/").pop() ?? "attachment"
      });
    }
    if (!thread.messages) thread.messages = [];
    thread.messages.push(
      {
        role: "student",
        content: voiceTranscript ? `${question}\nVoice transcript: ${voiceTranscript}` : question,
        mode,
        createdAt: new Date().toISOString()
      },
      {
        role: "assistant",
        content: guidance.reply,
        mode,
        createdAt: new Date().toISOString()
      }
    );
    if (mode === "reveal-answer") {
      thread.resolved_at = new Date().toISOString();
    }
    const { data } = await supabase.from('doubts').update({
      question: thread.question,
      subject: thread.subject,
      class: thread.class,
      response: thread.response,
      mode: thread.mode,
      voice_transcript: thread.voice_transcript,
      weak_topic_tags: thread.weak_topic_tags,
      attachments: thread.attachments,
      messages: thread.messages,
      resolved_at: thread.resolved_at
    }).eq('id', thread.id).select().single();
    thread = data;
  }

  await settleNonCriticalTasks(
    "student-ask-doubt",
    [
      recalculateStudentAnalytics(studentId),
      createNotification({
        recipientId: studentId,
        type: "ai-guidance",
        title: "AI doubt guidance ready",
        message: `Your ${subject} doubt now has guided teaching support.`,
        relatedEntityType: "doubt",
        relatedEntityId: thread.id
      }),
      notifyLinkedParents(
        studentId,
        "Student used AI teacher",
        `${student.name} used the AI teacher for ${subject}.`,
        "doubt",
        thread.id
      ),
      recordAuditEventFromRequest(req, {
        action: "student.doubt.asked",
        entityType: "doubt",
        entityId: thread.id,
        targetUserId: studentId,
        details: {
          subject,
          mode,
          attachmentAssetId: attachmentAssetId ?? null
        }
      })
    ],
    {
      studentId,
      doubtId: thread.id
    }
  );

  ok(
    res,
    {
      threadId: thread.id,
      guidedReply: guidance.reply,
      followUpPrompt: guidance.followUpPrompt,
      suggestedActions: guidance.suggestedActions,
      weakTopicTags: guidance.weakTopicTags,
      revealAvailable: guidance.revealAvailable
    },
    "Guided response generated.",
    201
  );
}
