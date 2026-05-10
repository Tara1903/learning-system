import type { Request, Response } from "express";

import type { DoubtMessage } from "../models/Doubt.js";
import { DoubtModel } from "../models/Doubt.js";
import { UploadAssetModel } from "../models/UploadAsset.js";
import { UserModel } from "../models/User.js";
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

  const student = await UserModel.findById(studentId);
  if (!student) {
    throw new ApiError(404, "Student not found.");
  }

  const attachmentAsset = attachmentAssetId ? await UploadAssetModel.findById(attachmentAssetId) : null;
  if (attachmentAsset && req.user) {
    await assertUserCanAccessUpload(req.user, attachmentAsset);
  }

  const attachmentDownloadUrl = attachmentAsset ? buildUploadDownloadUrl(String(attachmentAsset._id)) : attachmentUrl;
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

  let thread = threadId ? await DoubtModel.findOne({ _id: threadId, studentId }) : null;
  const previousMessages =
    thread?.messages.slice(-4).map((message: DoubtMessage) => `${message.role}: ${message.content}`) ?? [];

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
    thread = await DoubtModel.create({
      studentId,
      question,
      subject,
      class: studentClass,
      response: guidance.reply,
      mode,
      attachments:
        attachmentAsset && attachmentDownloadUrl
          ? [
              {
                type: inferAttachmentType(attachmentAsset.mimeType),
                url: attachmentDownloadUrl,
                fileName: attachmentAsset.originalFileName || attachmentAsset.fileName,
                assetId: attachmentAsset._id
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
      voiceTranscript,
      weakTopicTags: guidance.weakTopicTags,
      messages: [
        {
          role: "student",
          content: voiceTranscript ? `${question}\nVoice transcript: ${voiceTranscript}` : question,
          mode,
          createdAt: new Date()
        },
        {
          role: "assistant",
          content: guidance.reply,
          mode,
          createdAt: new Date()
        }
      ],
      resolvedAt: mode === "reveal-answer" ? new Date() : undefined
    });
  } else {
    thread.question = question;
    thread.subject = subject;
    thread.class = studentClass;
    thread.response = guidance.reply;
    thread.mode = mode;
    thread.voiceTranscript = voiceTranscript ?? thread.voiceTranscript;
    thread.weakTopicTags = Array.from(new Set([...thread.weakTopicTags, ...guidance.weakTopicTags]));
    if (attachmentAsset && attachmentDownloadUrl) {
      thread.attachments.push({
        type: inferAttachmentType(attachmentAsset.mimeType),
        url: attachmentDownloadUrl,
        fileName: attachmentAsset.originalFileName || attachmentAsset.fileName,
        assetId: attachmentAsset._id
      });
    } else if (attachmentUrl) {
      thread.attachments.push({
        type: "image",
        url: attachmentUrl,
        fileName: attachmentUrl.split("/").pop() ?? "attachment"
      });
    }
    thread.messages.push(
      {
        role: "student",
        content: voiceTranscript ? `${question}\nVoice transcript: ${voiceTranscript}` : question,
        mode,
        createdAt: new Date()
      },
      {
        role: "assistant",
        content: guidance.reply,
        mode,
        createdAt: new Date()
      }
    );
    if (mode === "reveal-answer") {
      thread.resolvedAt = new Date();
    }
    await thread.save();
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
        relatedEntityId: String(thread._id)
      }),
      notifyLinkedParents(
        studentId,
        "Student used AI teacher",
        `${student.name} used the AI teacher for ${subject}.`,
        "doubt",
        String(thread._id)
      ),
      recordAuditEventFromRequest(req, {
        action: "student.doubt.asked",
        entityType: "doubt",
        entityId: String(thread._id),
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
      doubtId: String(thread._id)
    }
  );

  ok(
    res,
    {
      threadId: String(thread._id),
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
