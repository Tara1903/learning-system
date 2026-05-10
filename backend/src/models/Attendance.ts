import mongoose, { Schema } from "mongoose";

import type { AttendanceStatus } from "../types/domain.js";

export interface AttendanceDocument extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  class: string;
  date: Date;
  status: AttendanceStatus;
  markedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<AttendanceDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    class: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late"],
      required: true
    },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  {
    timestamps: true
  }
);

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

export const AttendanceModel =
  mongoose.models.Attendance || mongoose.model<AttendanceDocument>("Attendance", attendanceSchema);

