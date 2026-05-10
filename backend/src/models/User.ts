import mongoose, { Schema } from "mongoose";

import type { UserRole } from "../types/domain.js";

export interface UserProfile {
  phone?: string;
  section?: string;
  admissionNumber?: string;
  guardianName?: string;
}

export interface UserDocument extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  class?: string;
  createdBy?: mongoose.Types.ObjectId;
  linkedStudentId?: mongoose.Types.ObjectId;
  linkedStudentIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  tokenVersion: number;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  profile?: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

const userProfileSchema = new Schema<UserProfile>(
  {
    phone: String,
    section: String,
    admissionNumber: String,
    guardianName: String
  },
  { _id: false }
);

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "teacher", "student", "parent"],
      required: true
    },
    class: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    linkedStudentId: { type: Schema.Types.ObjectId, ref: "User" },
    linkedStudentIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLoginAt: Date,
    profile: userProfileSchema
  },
  {
    timestamps: true
  }
);

userSchema.index({ role: 1, class: 1, name: 1 });
userSchema.index({ linkedStudentIds: 1 });

export const UserModel = mongoose.models.User || mongoose.model<UserDocument>("User", userSchema);
