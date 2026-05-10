import { z } from "zod";

const objectIdLike = z.string().trim().min(1);
const emailSchema = z.string().trim().email();
const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128, "Password must be 128 characters or fewer.");

const userProfileSchema = z
  .object({
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    section: z.string().trim().max(30).optional().or(z.literal("")),
    admissionNumber: z.string().trim().max(50).optional().or(z.literal("")),
    guardianName: z.string().trim().max(120).optional().or(z.literal(""))
  })
  .optional();

const linkedStudentIdsSchema = z
  .array(objectIdLike)
  .max(10, "A parent can only be linked to up to 10 students.")
  .optional();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

export const setupPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    password: passwordSchema,
    confirmPassword: passwordSchema
  })
  .refine((value: { password: string; confirmPassword: string }) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = setupPasswordSchema;

export const createStudentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  class: z.string().trim().min(1).max(20),
  profile: userProfileSchema,
  isActive: z.boolean().optional()
});

export const createTeacherSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  profile: userProfileSchema,
  isActive: z.boolean().optional()
});

export const createParentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  profile: userProfileSchema,
  isActive: z.boolean().optional(),
  linkedStudentId: objectIdLike.optional(),
  linkedStudentIds: linkedStudentIdsSchema
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  class: z.string().trim().max(20).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  profile: userProfileSchema,
  linkedStudentId: objectIdLike.optional(),
  linkedStudentIds: linkedStudentIdsSchema
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean()
});

export const adminUserQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  role: z.enum(["admin", "teacher", "student", "parent"]).optional()
});

const attendanceRecordSchema = z.object({
  studentId: objectIdLike,
  class: z.string().trim().min(1).max(20),
  date: z.string().trim().min(1),
  status: z.enum(["present", "absent", "late"])
});

export const attendanceMarkSchema = z.union([
  attendanceRecordSchema,
  z.object({
    records: z.array(attendanceRecordSchema).min(1)
  })
]);

export const practiceGenerateSchema = z.object({
  subject: z.string().trim().max(120).optional()
});

export const practiceSubmitSchema = z.object({
  responses: z
    .array(
      z.object({
        questionIndex: z.coerce.number().int().min(0),
        answer: z.string().trim().min(1)
      })
    )
    .min(1)
});

export const askDoubtSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  studentClass: z.string().trim().min(1).max(20),
  subject: z.string().trim().min(1).max(120),
  mode: z.enum(["hint", "step-by-step", "simplify", "reveal-answer"]),
  threadId: objectIdLike.optional(),
  attachmentAssetId: objectIdLike.optional(),
  attachmentUrl: z.string().trim().url().optional(),
  voiceTranscript: z.string().trim().max(4000).optional()
});

export const routeIdParamSchema = z.object({
  id: objectIdLike
});

export const attendanceByClassQuerySchema = z.object({
  date: z.string().trim().optional()
});

export const uploadDownloadParamSchema = z.object({
  id: objectIdLike
});

export const notificationsQuerySchema = paginationSchema;
