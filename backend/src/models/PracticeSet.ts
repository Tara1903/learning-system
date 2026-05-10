import mongoose, { Schema } from "mongoose";

export interface PracticeQuestion {
  prompt: string;
  answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  status: "pending" | "correct" | "incorrect";
  studentAnswer?: string;
  feedback?: string;
  answeredAt?: Date;
}

export interface PracticeSetDocument extends mongoose.Document {
  studentId: mongoose.Types.ObjectId;
  subject: string;
  topicTags: string[];
  questions: PracticeQuestion[];
  completionRate: number;
  accuracyPercentage: number;
  completedQuestions: number;
  completedAt?: Date;
  lastAttemptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const practiceQuestionSchema = new Schema<PracticeQuestion>(
  {
    prompt: { type: String, required: true },
    answer: { type: String, required: true },
    explanation: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "correct", "incorrect"],
      default: "pending"
    },
    studentAnswer: String,
    feedback: String,
    answeredAt: Date
  },
  { _id: false }
);

const practiceSetSchema = new Schema<PracticeSetDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, trim: true },
    topicTags: { type: [String], default: [] },
    questions: { type: [practiceQuestionSchema], default: [] },
    completionRate: { type: Number, default: 0 },
    accuracyPercentage: { type: Number, default: 0 },
    completedQuestions: { type: Number, default: 0 },
    completedAt: Date,
    lastAttemptedAt: Date
  },
  {
    timestamps: true
  }
);

practiceSetSchema.index({ studentId: 1, updatedAt: -1 });

export const PracticeSetModel =
  mongoose.models.PracticeSet || mongoose.model<PracticeSetDocument>("PracticeSet", practiceSetSchema);
