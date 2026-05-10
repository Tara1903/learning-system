import mongoose, { Schema } from "mongoose";

import type { WeakTopic } from "../types/domain.js";

export interface AnalyticsDocument extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  weakTopics: WeakTopic[];
  doubtCount: number;
  attendancePercentage: number;
  practiceAccuracy: number;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const weakTopicSchema = new Schema<WeakTopic>(
  {
    topic: { type: String, required: true },
    subject: { type: String, required: true },
    confidence: { type: Number, required: true }
  },
  { _id: false }
);

const analyticsSchema = new Schema<AnalyticsDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    weakTopics: { type: [weakTopicSchema], default: [] },
    doubtCount: { type: Number, default: 0 },
    attendancePercentage: { type: Number, default: 0 },
    practiceAccuracy: { type: Number, default: 0 },
    lastActivityAt: Date
  },
  {
    timestamps: true
  }
);

export const AnalyticsModel =
  mongoose.models.Analytics || mongoose.model<AnalyticsDocument>("Analytics", analyticsSchema);

