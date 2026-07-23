import { supabase } from '../../config/db.js';
import { env } from "../../config/env.js";
import type { AuthUser } from "../../types/domain.js";
import { ApiError } from "../../utils/http.js";

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function buildUploadDownloadUrl(assetId: string): string {
  if (env.publicApiBaseUrl.startsWith("/")) {
    return `${stripTrailingSlash(env.publicApiBaseUrl)}/uploads/${assetId}/download`;
  }

  return new URL(`uploads/${assetId}/download`, withTrailingSlash(env.publicApiBaseUrl)).toString();
}

export function serializeUploadAsset(asset: any) {
  return {
    assetId: String(asset.id),
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    downloadUrl: buildUploadDownloadUrl(String(asset.id)),
    publicUrl: buildUploadDownloadUrl(String(asset.id)),
    transcript: asset.transcript
  };
}

export async function assertUserCanAccessUpload(user: AuthUser, asset: any): Promise<void> {
  if (user.role === "admin" || user.role === "teacher" || String(asset.ownerId) === user.id) {
    return;
  }

  if (user.role === "parent") {
    const { data: parent } = await supabase.from('users').select('linkedStudentId, linkedStudentIds').eq('id', user.id).single();
    const linkedIds = [
      ...(parent?.linkedStudentId ? [String(parent.linkedStudentId)] : []),
      ...(parent?.linkedStudentIds ?? []).map((item: { toString(): string }) => String(item))
    ];

    if (linkedIds.includes(String(asset.ownerId))) {
      return;
    }
  }

  throw new ApiError(403, "You do not have access to this upload.");
}
