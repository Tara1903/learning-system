import type { Request, Response } from "express";

import { supabase } from "../config/db.js";
import { getStudentAnalytics, buildInstituteAnalytics } from "../services/analytics/analyticsService.js";
import { recordAuditEventFromRequest } from "../services/audit/auditService.js";
import { createNotification } from "../services/notification/notificationService.js";
import { settleNonCriticalTasks } from "../services/ops/sideEffects.js";
import { createInviteForUser, hashPlaceholderPassword } from "./authController.js";
import { ApiError, ok } from "../utils/http.js";

export interface UserProfile {
  phone?: string;
  section?: string;
  admissionNumber?: string;
  guardianName?: string;
}

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

      if (typeof item === "object" && item.id) {
        return {
          id: String(item.id),
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
        ? user.linkedStudentIds.map((item: any) => String(item?.id ?? item))
        : [];

  return {
    id: String(user.id),
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

async function ensureUniqueEmail(email: string, excludeUserId?: string): Promise<void> {
  let query = supabase.from("users").select("id").eq("email", email);
  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data: existingUser } = await query.maybeSingle();

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists.");
  }
}

async function validateLinkedStudents(linkedStudentIds: string[]): Promise<string[]> {
  if (!linkedStudentIds.length) {
    throw new ApiError(400, "Parent must be linked to at least one student.");
  }

  const { data: students } = await supabase.from("users").select("id").in("id", linkedStudentIds).eq("role", "student");

  if (!students || students.length !== linkedStudentIds.length) {
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
  
  let query = supabase.from("users").select("*", { count: "exact" });
  if (filter.role) {
    query = query.eq("role", filter.role);
  }
  if (filter.search) {
    query = query.or(`name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,class.ilike.%${filter.search}%`);
  }
  
  const { data: users, count: total } = await query
    .order("role", { ascending: true })
    .order("class", { ascending: true })
    .order("name", { ascending: true })
    .range(skip, skip + pageSize - 1);

  const hydratedUsers = users || [];
  const studentAnalytics = new Map(
    await Promise.all(
      hydratedUsers
        .filter((user) => user.role === "student")
        .map(async (student) => [String(student.id), await getStudentAnalytics(String(student.id))] as const)
    )
  );

  return {
    items: hydratedUsers.map((user) =>
      serializeManagedUser(user, user.role === "student" ? studentAnalytics.get(String(user.id)) : undefined)
    ),
    pagination: buildPagination(page, pageSize, total || 0)
  };
}

async function assertAdminStatusChangeAllowed(userId: string, nextIsActive: boolean) {
  const { data: user } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.role === "admin" && user.isActive && !nextIsActive) {
    const { count: activeAdminCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("isActive", true)
      .neq("id", userId);

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

  const password = await hashPlaceholderPassword();

  const { data: userArray } = await supabase.from("users").insert({
    name,
    email,
    password,
    role,
    class: role === "student" ? classLevel : null,
    createdBy: req.user?.id,
    linkedStudentId: linkedStudentIds[0] || null,
    linkedStudentIds,
    profile,
    isActive
  }).select();

  const user = userArray?.[0];

  if (!user) {
    throw new ApiError(500, "Failed to create user.");
  }

  const invite = await createInviteForUser(String(user.id), req.user?.id ?? String(user.id));

  await settleNonCriticalTasks(
    "admin-create-user",
    [
      createNotification({
        recipientId: String(user.id),
        type: "account-created",
        title: "Welcome to Adhyayan",
        message: "Your institutional account is ready. Complete password setup using your invite link."
      }),
      recordAuditEventFromRequest(req, {
        action: `admin.${role}.created`,
        entityType: "user",
        entityId: String(user.id),
        targetUserId: String(user.id),
        details: {
          role,
          isActive,
          linkedStudentIds
        }
      })
    ],
    {
      targetUserId: String(user.id),
      role
    }
  );

  ok(
    res,
    {
      user: serializeManagedUser(user),
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
      search: search?.trim() || ""
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
    search: search?.trim() || ""
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
  let user = await assertAdminStatusChangeAllowed(req.params.id as string, typeof req.body.isActive === "boolean" ? req.body.isActive : true);

  const name = normalizeRequiredText(req.body.name ?? user.name, "Name");
  const email = normalizeRequiredText(req.body.email ?? user.email, "Email").toLowerCase();
  const profile = req.body.profile === undefined ? user.profile : normalizeProfile(req.body.profile);
  const classLevel = normalizeOptionalText(req.body.class ?? user.class);
  const nextIsActive = typeof req.body.isActive === "boolean" ? req.body.isActive : user.isActive;

  await ensureUniqueEmail(email, String(user.id));

  if (user.role === "student" && !classLevel) {
    throw new ApiError(400, "Student class is required.");
  }

  const hasLinkedStudentInput =
    req.body.linkedStudentId !== undefined || req.body.linkedStudentIds !== undefined;
  const currentLinkedStudentIds = [
    ...(user.linkedStudentId ? [String(user.linkedStudentId)] : []),
    ...(user.linkedStudentIds || []).map((item: { toString(): string }) => String(item))
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
  user.class = user.role === "student" ? classLevel : null;
  user.linkedStudentId = linkedStudentIds[0] || null;
  user.linkedStudentIds = linkedStudentIds || [];

  if (activationChanged) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  }

  const { data: updatedUsers } = await supabase.from("users").update({
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    profile: user.profile,
    class: user.class,
    linkedStudentId: user.linkedStudentId,
    linkedStudentIds: user.linkedStudentIds,
    tokenVersion: user.tokenVersion
  }).eq("id", user.id).select();
  
  user = updatedUsers?.[0] || user;

  await settleNonCriticalTasks(
    "admin-update-user",
    [
      ...(activationChanged
        ? [
            createNotification({
              recipientId: String(user.id),
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
        entityId: String(user.id),
        targetUserId: String(user.id),
        details: {
          isActive: user.isActive,
          activationChanged,
          linkedStudentIds
        }
      })
    ],
    {
      targetUserId: String(user.id)
    }
  );

  ok(res, { user: serializeManagedUser(user) }, "User updated successfully.");
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!userId) {
    throw new ApiError(400, "User id is required.");
  }

  let user = await assertAdminStatusChangeAllowed(userId, req.body.isActive);
  user.isActive = req.body.isActive;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  
  const { data: updatedUsers } = await supabase.from("users").update({
    isActive: user.isActive,
    tokenVersion: user.tokenVersion
  }).eq("id", user.id).select();
  
  user = updatedUsers?.[0] || user;

  await settleNonCriticalTasks(
    "admin-update-user-status",
    [
      createNotification({
        recipientId: String(user.id),
        type: "account-status-updated",
        title: user.isActive ? "Account reactivated" : "Account paused",
        message: user.isActive
          ? "Your Adhyayan account has been reactivated by the institute admin."
          : "Your Adhyayan account has been paused by the institute admin."
      }),
      recordAuditEventFromRequest(req, {
        action: user.isActive ? "admin.user.activated" : "admin.user.deactivated",
        entityType: "user",
        entityId: String(user.id),
        targetUserId: String(user.id),
        details: {
          isActive: user.isActive
        }
      })
    ],
    {
      targetUserId: String(user.id)
    }
  );

  ok(
    res,
    { user: serializeManagedUser(user) },
    user.isActive ? "User activated successfully." : "User deactivated successfully."
  );
}

export async function getAdminAnalytics(_req: Request, res: Response): Promise<void> {
  const analytics = await buildInstituteAnalytics();
  ok(res, analytics);
}
