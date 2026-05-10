import mongoose, { Schema } from "mongoose";

import type { DoubtMessageRole, DoubtMode } from "../types/domain.js";

export interface DoubtAttachment {
  type: "image" | "audio";
  url: string;
  fileName: string;
  assetId?: mongoose.Types.ObjectId;
}

export interface DoubtMessage {
  role: DoubtMessageRole;
  content: string;
  mode?: DoubtMode;
  createdAt: Date;
}

export interface DoubtDocument extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  question: string;
  subject: string;
  class: string;
  response?: string;
  mode: DoubtMode;
  messages: DoubtMessage[];
  attachments: DoubtAttachment[];
  voiceTranscript?: string;
  weakTopicTags: string[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<DoubtMessage>(
  {
    role: {
      type: String,
      enum: ["student", "assistant", "system"],
      required: true
    },
    content: { type: String, required: true },
    mode: {
      type: String,
      enum: ["hint", "step-by-step", "simplify", "reveal-answer"]
    },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const attachmentSchema = new Schema<DoubtAttachment>(
  {
    type: { type: String, enum: ["image", "audio"], required: true },
    url: { type: String, required: true },
    fileName: { type: String, required: true },
    assetId: { type: Schema.Types.ObjectId, ref: "UploadAsset" }
  },
  { _id: false }
);

const doubtSchema = new Schema<DoubtDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    question: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    class: { type: String, required: true, trim: true },
    response: String,
    mode: {
      type: String,
      enum: ["hint", "step-by-step", "simplify", "reveal-answer"],
      default: "hint"
    },
    messages: { type: [messageSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    voiceTranscript: String,
    weakTopicTags: { type: [String], default: [] },
    resolvedAt: Date
  },
  {
    timestamps: true
  }
);

doubtSchema.index({ studentId: 1, updatedAt: -1 });

export const DoubtModel = mongoose.models.Doubt || mongoose.model<DoubtDocument>("Doubt", doubtSchema);
