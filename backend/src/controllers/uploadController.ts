import type { Request, Response } from "express";

import { env } from "../config/env.js";
import { supabase } from '../config/db.js';
import { transcribeStudentVoiceNote } from "../services/ai/transcriptionService.js";
import { recordAuditEventFromRequest } from "../services/audit/auditService.js";
import { settleNonCriticalTasks } from "../services/ops/sideEffects.js";
import { assertUserCanAccessUpload, serializeUploadAsset } from "../services/upload/accessService.js";
import { assertUploadSafety } from "../services/upload/safetyService.js";
import { readUploadedAsset, saveUploadedFile } from "../services/upload/storageService.js";
import { ApiError, ok } from "../utils/http.js";

function ensureAuthenticatedUser(req: Request) {
  if (!req.user) {
    throw new ApiError(401, "Authentication required.");
  }

  return req.user;
}

export async function uploadDoubtImage(req: Request, res: Response): Promise<void> {
  const user = ensureAuthenticatedUser(req);

  if (!env.enableAiImageDoubts) {
    throw new ApiError(403, "Image-based doubt uploads are disabled in this environment.");
  }

  if (!req.file) {
    throw new ApiError(400, "Image file is required.");
  }

  await assertUploadSafety(req.file, "images");
  const saved = await saveUploadedFile(req.file, "images");
  const { data: asset, error: assetError } = await supabase
    .from('upload_assets')
    .insert({
      ownerId: user.id,
      ownerRole: user.role,
      category: "images",
      storageDriver: saved.storageDriver,
      storageKey: saved.storageKey,
      absolutePath: saved.absolutePath,
      mimeType: saved.mimeType,
      originalFileName: saved.originalFileName,
      fileName: saved.fileName,
      byteSize: saved.byteSize
    })
    .select()
    .single();

  if (assetError || !asset) {
    throw new ApiError(500, "Failed to create upload asset: " + (assetError?.message || "Unknown error"));
  }

  await settleNonCriticalTasks("upload-image-audit", [
    recordAuditEventFromRequest(req, {
      action: "upload.image.created",
      entityType: "uploadAsset",
      entityId: String(asset.id),
      targetUserId: String(asset.ownerId),
      details: {
        category: asset.category,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize
      }
    })
  ]);

  ok(res, serializeUploadAsset(asset), "Image uploaded successfully.", 201);
}

export async function uploadVoiceNote(req: Request, res: Response): Promise<void> {
  const user = ensureAuthenticatedUser(req);

  if (!env.enableAiVoiceDoubts) {
    throw new ApiError(403, "Voice-based doubt uploads are disabled in this environment.");
  }

  if (!req.file) {
    throw new ApiError(400, "Audio file is required.");
  }

  await assertUploadSafety(req.file, "audio");
  const transcript = await transcribeStudentVoiceNote({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    fileName: req.file.originalname || "voice-note.webm"
  });
  const saved = await saveUploadedFile(req.file, "audio");
  const { data: asset, error: assetError } = await supabase
    .from('upload_assets')
    .insert({
      ownerId: user.id,
      ownerRole: user.role,
      category: "audio",
      storageDriver: saved.storageDriver,
      storageKey: saved.storageKey,
      absolutePath: saved.absolutePath,
      mimeType: saved.mimeType,
      originalFileName: saved.originalFileName,
      fileName: saved.fileName,
      byteSize: saved.byteSize,
      transcript
    })
    .select()
    .single();

  if (assetError || !asset) {
    throw new ApiError(500, "Failed to create upload asset: " + (assetError?.message || "Unknown error"));
  }

  await settleNonCriticalTasks("upload-audio-audit", [
    recordAuditEventFromRequest(req, {
      action: "upload.audio.created",
      entityType: "uploadAsset",
      entityId: String(asset.id),
      targetUserId: String(asset.ownerId),
      details: {
        category: asset.category,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize
      }
    })
  ]);

  ok(res, serializeUploadAsset(asset), "Voice note uploaded successfully.", 201);
}

export async function downloadUploadAsset(req: Request, res: Response): Promise<void> {
  const user = ensureAuthenticatedUser(req);
  const { data: asset, error } = await supabase
    .from('upload_assets')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !asset) {
    throw new ApiError(404, "Upload not found.");
  }

  await assertUserCanAccessUpload(user, asset);

  const storedFile = await readUploadedAsset(asset);
  await settleNonCriticalTasks("upload-download-audit", [
    recordAuditEventFromRequest(req, {
      action: "upload.downloaded",
      entityType: "uploadAsset",
      entityId: String(asset.id),
      targetUserId: String(asset.ownerId)
    })
  ]);

  res.setHeader("Content-Type", storedFile.mimeType);
  res.setHeader("Content-Length", String(storedFile.bytes.length));
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(storedFile.fileName)}"`);
  res.send(storedFile.bytes);
}
