export type UserRole = "admin" | "teacher" | "student" | "parent";

export type AttendanceStatus = "present" | "absent" | "late";

export type DoubtMode = "hint" | "step-by-step" | "simplify" | "reveal-answer";

export type DoubtMessageRole = "student" | "assistant" | "system";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  tokenVersion: number;
  class?: string;
  linked_student_id?: string;
}

export interface WeakTopic {
  topic: string;
  subject: string;
  confidence: number;
}

export interface SuggestedAction {
  label: string;
  mode: DoubtMode;
}
