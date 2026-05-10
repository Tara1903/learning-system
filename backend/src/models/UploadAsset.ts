import mongoose, { Schema } from "mongoose";

import type { UserRole } from "../types/domain.js";

export type UploadCategory = "images" | "audio";
export type UploadStorageDriver = "local" | "s3";

export interface UploadAssetDocument extends mongoose.Document {
  ownerId: mongoose.Types.ObjectId;
  ownerRole: UserRole;
  category: UploadCategory;
  storageDriver: UploadStorageDriver;
  storageKey: string;
  absolutePath?: string;
  mimeType: string;
  originalFileName: string;
  fileName: string;
  byteSize: number;
  transcript?: string;
  createdAt: Date;
  updatedAt: Date;
}

const uploadAssetSchema = new Schema<UploadAssetDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerRole: {
      type: String,
      enum: ["admin", "teacher", "student", "parent"],
      required: true
    },
    category: {
      type: String,
      enum: ["images", "audio"],
      required: true,
      index: true
    },
    storageDriver: {
      type: String,
      enum: ["local", "s3"],
      required: true
    },
    storageKey: { type: String, required: true, trim: true },
    absolutePath: String,
    mimeType: { type: String, required: true, trim: true },
    originalFileName: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    byteSize: { type: Number, required: true },
    transcript: String
  },
  {
    timestamps: true
  }
);

uploadAssetSchema.index({ ownerId: 1, createdAt: -1 });

export const UploadAssetModel =
  mongoose.models.UploadAsset || mongoose.model<UploadAssetDocument>("UploadAsset", uploadAssetSchema);
