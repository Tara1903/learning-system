import type { Request, Response } from "express";

import type { UserProfile } from "../models/User.js";
import { UserModel } from "../models/User.js";
import { getStudentAnalytics, buildInstituteAnalytics } from "../services/analytics/analyticsService.js";
import { recordAuditEventFromRequest } from "../services/audit/auditService.js";
import { createNotification } from "../services/notification/notificationService.js";
import { settleNonCriticalTasks } from "../services/ops/sideEffects.js";
import { createInviteForUser, hashPlaceholderPassword } from "./authController.js";
import { ApiError, ok } from "../utils/http.js";

interface AdminUserListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: "admin" | "teacher" | "student" | "parent";
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function normalizeProfile(rawProfile: unknown): UserProfile | undefined {
  if (!rawProfile || typeof rawProfile !== "object") {
    return undefined;
  }

  const profile = rawProfile as Record<string, unknown>;
  const normalizedProfile: UserProfile = {
    phone: normalizeOptionalText(profile.phone),
    section: normalizeOptionalText(profile.section),
    admissionNumber: normalizeOptionalText(profile.admissionNumber),
    guardianName: normalizeOptionalText(profile.guardianName)
  };

  return Object.values(normalizedProfile).some(Boolean) ? normalizedProfile : undefined;
}

function normalizeLinkedStudentIds(linkedStudentId: unknown, linkedStudentIds: unknown): string[] {
  const values = [
    ...(typeof linkedStudentId === "string" ? [linkedStudentId] : []),
    ...(Array.isArray(linkedStudentIds) ? linkedStudentIds : [])
  ];

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function extractLinkedStudents(user: any) {
  const linkedStudents = [
    ...(user.linkedStudentId ? [user.linkedStudentId] : []),
    ...(Array.isArray(user.linkedStudentIds) ? user.linkedStudentIds : [])
  ]
    .map((item: any) => {
      if (!item) {
        return null;
      }

      if (typeof item === "object" && item._id) {
        return {
          id: String(item._id),
          name: item.name ?? "Student",
          class: item.class
        };
      }

      return {
        id: String(item),
        name: "Student"
      };
    })
    .filter((item): item is { id: string; name: string; class?: string } => Boolean(item));

  return Array.from(new Map(linkedStudents.map((student) => [student.id, student])).values());
}

function serializeManagedUser(user: any, analytics?: unknown) {
  const linkedStudents = extractLinkedStudents(user);
  const linkedStudentIds =
    linkedStudents.length > 0
      ? linkedStudents.map((student) => student.id)
      : Array.isArray(user.linkedStudentIds)
        ? user.linkedStudentIds.map((item: any) => String(item?._id ?? item))
        : [];

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    class: user.class,
    isActive: user.isActive,
    profile: user.profile,
    linkedStudentId: linkedStudentIds[0],
    linkedStudentIds,
    linkedStudents,
    analytics,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function buildPagination(page: number, pageSize: number, total: number): PaginationState {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: totalPages > 0 && page < totalPages,
    hasPreviousPage: page > 1
  };
}

function buildSearchFilter(search?: string) {
  if (!search?.trim()) {
    return {};
  }

  const pattern = new RegExp(escapeRegex(search.trim()), "i");

  return {
    $or: [{ name: pattern }, { email: pattern }, { class: pattern }]
  };
}

async function ensureUniqueEmail(email: string, excludeUserId?: string): Promise<void> {
  const existingUser = await UserModel.findOne({
    email,
    ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {})
  }).select("_id");

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists.");
  }
}

async function validateLinkedStudents(linkedStudentIds: string[]): Promise<string[]> {
  if (!linkedStudentIds.length) {
    throw new ApiError(400, "Parent must be linked to at least one student.");
  }

  const students = await UserModel.find({
    _id: { $in: linkedStudentIds },
    role: "student"
  }).select("_id");

  if (students.length !== linkedStudentIds.length) {
    throw new ApiError(400, "Parents can only be linked to existing student accounts.");
  }

  return linkedStudentIds;
}

async function buildManagedUsersPage(
  filter: Record<string, unknown>,
  page: number,
  pageSize: number
): Promise<{ items: ReturnType<typeof serializeManagedUser>[]; pagination: PaginationState }> {
  const skip = (page - 1) * pageSize;
  const [total, users] = await Promise.all([
    UserModel.countDocuments(filter),
    UserModel.find(filter)
      .select("-password")
      .populate("linkedStudentId", "name class")
      .populate("linkedStudentIds", "name class")
      .sort({ role: 1, class: 1, name: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean()
  ]);

  const hydratedUsers = users as any[];
  const studentAnalytics = new Map(
    await Promise.all(
      hydratedUsers
        .filter((user) => user.role === "student")
        .map(async (student) => [String(student._id), await getStudentAnalytics(String(student._id))] as const)
    )
  );

  return {
    items: hydratedUsers.map((user) =>
      serializeManagedUser(user, user.role === "student" ? studentAnalytics.get(String(user._id)) : undefined)
    ),
    pagination: buildPagination(page, pageSize, total)
  };
}

async function assertAdminStatusChangeAllowed(userId: string, nextIsActive: boolean) {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.role === "admin" && user.isActive && !nextIsActive) {
    const activeAdminCount = await UserModel.countDocuments({
      role: "admin",
      isActive: true,
      _id: { $ne: userId }
    });

    if (activeAdminCount === 0) {
      throw new ApiError(400, "At least one active admin must remain.");
    }
  }

  return user;
}

async function createManagedUser(req: Request, res: Response, role: "student" | "teacher" | "parent") {
  const name = normalizeRequiredText(req.body.name, "Name");
  const email = normalizeRequiredText(req.body.email, "Email").toLowerCase();
  const classLevel = normalizeOptionalText(req.body.class);
  const profile = normalizeProfile(req.body.profile);
  const isActive = typeof req.body.isActive === "boolean" ? req.body.isActive : true;

  if (role === "student" && !classLevel) {
    throw new ApiError(400, "Student class is required.");
  }

  await ensureUniqueEmail(email);

  const linkedStudentIds =
    role === "parent"
      ? await validateLinkedStudents(normalizeLinkedStudentIds(req.body.linkedStudentId, req.body.linkedStudentIds))
      : [];

  const user = await UserModel.create({
    name,
    email,
    password: await hashPlaceholderPassword(),
    role,
    class: role === "student" ? classLevel : undefined,
    createdBy: req.user?.id,
    linkedStudentId: linkedStudentIds[0],
    linkedStudentIds,
    profile,
    isActive
  });

  const invite = await createInviteForUser(String(user._id), req.user?.id ?? String(user._id));

  await settleNonCriticalTasks(
    "admin-create-user",
    [
      createNotification({
        recipientId: String(user._id),
        type: "account-created",
        title: "Welcome to Adhyayan",
        message: "Your institutional account is ready. Complete password setup using your invite link."
      }),
      recordAuditEventFromRequest(req, {
        action: `admin.${role}.created`,
        entityType: "user",
        entityId: String(user._id),
        targetUserId: String(user._id),
        details: {
          role,
          isActive,
          linkedStudentIds
        }
      })
    ],
    {
      targetUserId: String(user._id),
      role
    }
  );

  ok(
    res,
    {
      user: serializeManagedUser(user.toObject()),
      ...invite
    },
    `${role} created successfully.`,
    201
  );
}

export async function createStudent(req: Request, res: Response): Promise<void> {
  await createManagedUser(req, res, "student");
}

export async function createTeacher(req: Request, res: Response): Promise<void> {
  await createManagedUser(req, res, "teacher");
}

export async function createParent(req: Request, res: Response): Promise<void> {
  await createManagedUser(req, res, "parent");
}

export async function getStudents(req: Request, res: Response): Promise<void> {
  const { page = 1, pageSize = 20, search } = req.query as unknown as AdminUserListQuery;
  const { items, pagination } = await buildManagedUsersPage(
    {
      role: "student",
      ...buildSearchFilter(search)
    },
    page,
    pageSize
  );

  ok(res, {
    students: items,
    pagination,
    filters: {
      role: "student",
      search: search?.trim() || ""
    }
  });
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  const { page = 1, pageSize = 20, role, search } = req.query as unknown as AdminUserListQuery;
  const filter = {
    ...(role ? { role } : {}),
    ...buildSearchFilter(search)
  };
  const { items, pagination } = await buildManagedUsersPage(filter, page, pageSize);

  ok(res, {
    users: items,
    pagination,
    filters: {
      role: role ?? "all",
      search: search?.trim() || ""
    }
  });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const user = await UserModel.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const name = normalizeRequiredText(req.body.name ?? user.name, "Name");
  const email = normalizeRequiredText(req.body.email ?? user.email, "Email").toLowerCase();
  const profile = req.body.profile === undefined ? user.profile : normalizeProfile(req.body.profile);
  const classLevel = normalizeOptionalText(req.body.class ?? user.class);
  const nextIsActive = typeof req.body.isActive === "boolean" ? req.body.isActive : user.isActive;

  await ensureUniqueEmail(email, String(user._id));

  if (user.role === "student" && !classLevel) {
    throw new ApiError(400, "Student class is required.");
  }

  await assertAdminStatusChangeAllowed(String(user._id), nextIsActive);

  const hasLinkedStudentInput =
    req.body.linkedStudentId !== undefined || req.body.linkedStudentIds !== undefined;
  const currentLinkedStudentIds = [
    ...(user.linkedStudentId ? [String(user.linkedStudentId)] : []),
    ...user.linkedStudentIds.map((item: { toString(): string }) => String(item))
  ];
  const linkedStudentIds =
    user.role === "parent"
      ? hasLinkedStudentInput
        ? await validateLinkedStudents(normalizeLinkedStudentIds(req.body.linkedStudentId, req.body.linkedStudentIds))
        : Array.from(new Set(currentLinkedStudentIds))
      : [];

  const activationChanged = user.isActive !== nextIsActive;

  user.name = name;
  user.email = email;
  user.isActive = nextIsActive;
  user.profile = profile;
  user.class = user.role === "student" ? classLevel : undefined;
  user.linkedStudentId = linkedStudentIds[0] as any;
  user.linkedStudentIds = linkedStudentIds as any;

  if (activationChanged) {
    user.tokenVersion += 1;
  }

  await user.save();
  await user.populate("linkedStudentId", "name class");
  await user.populate("linkedStudentIds", "name class");

  await settleNonCriticalTasks(
    "admin-update-user",
    [
      ...(activationChanged
        ? [
            createNotification({
              recipientId: String(user._id),
              type: "account-status-updated",
              title: user.isActive ? "Account reactivated" : "Account paused",
              message: user.isActive
                ? "Your Adhyayan account has been reactivated by the institute admin."
                : "Your Adhyayan account has been paused by the institute admin."
            })
          ]
        : []),
      recordAuditEventFromRequest(req, {
        action: "admin.user.updated",
        entityType: "user",
        entityId: String(user._id),
        targetUserId: String(user._id),
        details: {
          isActive: user.isActive,
          activationChanged,
          linkedStudentIds
        }
      })
    ],
    {
      targetUserId: String(user._id)
    }
  );

  ok(res, { user: serializeManagedUser(user.toObject()) }, "User updated successfully.");
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!userId) {
    throw new ApiError(400, "User id is required.");
  }

  const user = await assertAdminStatusChangeAllowed(userId, req.body.isActive);
  user.isActive = req.body.isActive;
  user.tokenVersion += 1;
  await user.save();

  await settleNonCriticalTasks(
    "admin-update-user-status",
    [
      createNotification({
        recipientId: String(user._id),
        type: "account-status-updated",
        title: user.isActive ? "Account reactivated" : "Account paused",
        message: user.isActive
          ? "Your Adhyayan account has been reactivated by the institute admin."
          : "Your Adhyayan account has been paused by the institute admin."
      }),
      recordAuditEventFromRequest(req, {
        action: user.isActive ? "admin.user.activated" : "admin.user.deactivated",
        entityType: "user",
        entityId: String(user._id),
        targetUserId: String(user._id),
        details: {
          isActive: user.isActive
        }
      })
    ],
    {
      targetUserId: String(user._id)
    }
  );

  ok(
    res,
    { user: serializeManagedUser(user.toObject()) },
    user.isActive ? "User activated successfully." : "User deactivated successfully."
  );
}

export async function getAdminAnalytics(_req: Request, res: Response): Promise<void> {
  const analytics = await buildInstituteAnalytics();
  ok(res, analytics);
}
