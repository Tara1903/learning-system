export type UserRole = "admin" | "teacher" | "student" | "parent";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  class?: string;
  linkedStudentId?: string;
  linkedStudentIds?: string[];
  profile?: {
    phone?: string;
    section?: string;
    admissionNumber?: string;
    guardianName?: string;
    photoUrl?: string;
    dob?: string;
    gender?: string;
    schoolName?: string;
    board?: string;
    fatherName?: string;
    motherName?: string;
    parentMobile?: string;
    whatsappNumber?: string;
    occupation?: string;
    address?: string;
    city?: string;
    tuitionStartDate?: string;
    dateOfAdmission?: string;
    feesPlan?: string;
    discount?: string;
    registrationFee?: string;
    receiptNo?: string;
    customStudentId?: string;
  };
}

export interface AppFeatures {
  imageDoubtUploadsEnabled: boolean;
  voiceDoubtUploadsEnabled: boolean;
}

export interface AuthSessionPayload {
  user: CurrentUser;
  features: AppFeatures;
}

export interface StudentLink {
  id: string;
  name: string;
  class?: string;
}

export interface ManagedUser extends CurrentUser {
  isActive: boolean;
  linkedStudents?: StudentLink[];
  analytics?: AnalyticsSummary;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UploadAssetSummary {
  assetId: string;
  fileName: string;
  mimeType: string;
  downloadUrl: string;
  publicUrl?: string;
  transcript?: string;
}

export interface ProvisioningResult {
  user: ManagedUser;
  inviteStatus: string;
  setupRequired: boolean;
  setupUrl: string;
  expiresAt: string;
}

export interface AttendanceRecord {
  _id: string;
  studentId: string | { _id: string; name: string; class?: string };
  class: string;
  date: string;
  status: "present" | "absent" | "late";
}

export interface WeakTopic {
  topic: string;
  subject: string;
  confidence: number;
}

export interface AnalyticsSummary {
  _id?: string;
  studentId: string;
  weakTopics: WeakTopic[];
  doubtCount: number;
  attendancePercentage: number;
  practiceAccuracy: number;
  lastActivityAt?: string;
}

export interface DoubtMessage {
  role: "student" | "assistant" | "system";
  content: string;
  mode?: "hint" | "step-by-step" | "simplify" | "reveal-answer";
  createdAt: string;
}

export interface DoubtThread {
  _id: string;
  question: string;
  subject: string;
  class: string;
  mode: "hint" | "step-by-step" | "simplify" | "reveal-answer";
  response?: string;
  weakTopicTags: string[];
  attachments: Array<{ type: "image" | "audio"; url: string; fileName: string; assetId?: string }>;
  voiceTranscript?: string;
  messages: DoubtMessage[];
  updatedAt: string;
}

export interface SuggestedAction {
  label: string;
  mode: "hint" | "step-by-step" | "simplify" | "reveal-answer";
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface PracticeQuestion {
  prompt: string;
  answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  status: "pending" | "correct" | "incorrect";
  studentAnswer?: string;
  feedback?: string;
  answeredAt?: string;
}

export interface PracticeSet {
  _id: string;
  subject: string;
  topicTags: string[];
  questions: PracticeQuestion[];
  completionRate: number;
  accuracyPercentage: number;
  completedQuestions: number;
  completedAt?: string;
  lastAttemptedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Schedule {
  id: string;
  class: string;
  subject: string;
  teacher_id?: string;
  teacher?: { name: string };
  start_time: string;
  end_time: string;
  type: "regular" | "exam" | "holiday";
  created_at?: string;
  updated_at?: string;
}

export interface FeeTransaction {
  id: string;
  fee_record_id: string;
  amount: number;
  payment_method: "cash" | "cheque" | "upi" | "bank_transfer";
  payment_date: string;
  recorded_by: string;
  receipt_number?: string;
  notes?: string;
}

export interface FeeRecord {
  id: string;
  student_id: string;
  student?: { name: string; class: string };
  title: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: "pending" | "partial" | "paid";
  transactions?: FeeTransaction[];
  created_at?: string;
  updated_at?: string;
}
