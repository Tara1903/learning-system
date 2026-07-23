import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";

import { env } from "../config/env.js";
import { supabase } from "../config/db.js";
import { issueOneTimeToken, consumeOneTimeToken } from "../services/auth/oneTimeTokenService.js";
import { recordAuditEvent, recordAuditEventFromRequest } from "../services/audit/auditService.js";
import { settleNonCriticalTasks } from "../services/ops/sideEffects.js";
import { ok, ApiError } from "../utils/http.js";
import { buildCookieOptions, signToken } from "../utils/jwt.js";

function toSafeUser(user: any) {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    class: user.class,
    linkedStudentId: user.linkedStudentId ? String(user.linkedStudentId) : undefined,
    linkedStudentIds: Array.isArray(user.linkedStudentIds)
      ? user.linkedStudentIds.map((item: unknown) => String(item))
      : [],
    profile: user.profile,
    isActive: user.isActive
  };
}

function buildFeatureFlags() {
  return {
    imageDoubtUploadsEnabled: env.enableAiImageDoubts,
    voiceDoubtUploadsEnabled: env.enableAiVoiceDoubts
  };
}

function buildAuthPayload(user: any) {
  return {
    user: toSafeUser(user),
    features: buildFeatureFlags()
  };
}

function buildFrontendUrl(path: string): string {
  const base = env.clientUrl.endsWith("/") ? env.clientUrl : `${env.clientUrl}/`;
  return new URL(path.replace(/^\//, ""), base).toString();
}

function buildInviteUrl(token: string): string {
  return buildFrontendUrl(`/setup-password?token=${encodeURIComponent(token)}`);
}

function buildResetUrl(token: string): string {
  return buildFrontendUrl(`/reset-password?token=${encodeURIComponent(token)}`);
}

function buildUnknownPassword(): string {
  return randomBytes(24).toString("hex");
}

async function registerFailedLogin(userId: string): Promise<void> {
  const { data: user } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();

  if (!user) {
    return;
  }

  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

  if (user.failedLoginAttempts >= env.loginAttemptLimit) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = new Date(Date.now() + env.loginLockMinutes * 60 * 1000).toISOString();
  }

  await supabase.from("users").update({
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil
  }).eq("id", userId);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  const { data: user } = await supabase.from("users").select("*").eq("email", email.toLowerCase()).maybeSingle();
  const now = new Date();

  if (user?.lockedUntil && new Date(user.lockedUntil) > now) {
    throw new ApiError(429, "Too many failed login attempts. Please try again later.");
  }

  if (!user || !user.isActive) {
    await settleNonCriticalTasks("login-failure-audit", [
      recordAuditEvent({
        action: "auth.login.failed",
        entityType: "user",
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        requestId: req.requestId,
        details: { email: email.toLowerCase() }
      })
    ]);
    throw new ApiError(401, "Invalid credentials.");
  }

  const matches = await bcrypt.compare(password, user.password);

  if (!matches) {
    await registerFailedLogin(String(user.id));
    await settleNonCriticalTasks("login-failure-audit", [
      recordAuditEvent({
        actorId: String(user.id),
        actorRole: user.role,
        action: "auth.login.failed",
        entityType: "user",
        entityId: String(user.id),
        targetUserId: String(user.id),
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        requestId: req.requestId
      })
    ]);
    throw new ApiError(401, "Invalid credentials.");
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = now.toISOString();
  await supabase.from("users").update({
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil,
    lastLoginAt: user.lastLoginAt
  }).eq("id", user.id);

  const token = signToken({
    id: String(user.id),
    email: user.email,
    role: user.role,
    name: user.name,
    tokenVersion: user.tokenVersion
  });

  res.cookie(env.cookieName, token, buildCookieOptions());
  await settleNonCriticalTasks("login-success-audit", [
    recordAuditEventFromRequest(req, {
      action: "auth.login.succeeded",
      entityType: "user",
      entityId: String(user.id),
      targetUserId: String(user.id)
    })
  ]);
  ok(res, buildAuthPayload(user), "Login successful.");
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new ApiError(401, "Authentication required.");
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", req.user.id).maybeSingle();
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  ok(res, buildAuthPayload(user));
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(env.cookieName, buildCookieOptions());
  ok(res, null, "Logged out.");
}

export async function setupPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token: string; password: string };
  const authToken = await consumeOneTimeToken("invite", token);
  const { data: user } = await supabase.from("users").select("*").eq("id", authToken.userId).maybeSingle();

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  user.password = await bcrypt.hash(password, 12);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  
  await supabase.from("users").update({
    password: user.password,
    tokenVersion: user.tokenVersion,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil
  }).eq("id", user.id);

  const sessionToken = signToken({
    id: String(user.id),
    email: user.email,
    role: user.role,
    name: user.name,
    tokenVersion: user.tokenVersion
  });

  res.cookie(env.cookieName, sessionToken, buildCookieOptions());
  await settleNonCriticalTasks("setup-password-audit", [
    recordAuditEvent({
      actorId: String(user.id),
      actorRole: user.role,
      action: "auth.invite.completed",
      entityType: "user",
      entityId: String(user.id),
      targetUserId: String(user.id),
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      requestId: req.requestId
    })
  ]);

  ok(res, { ...buildAuthPayload(user), setupComplete: true }, "Password setup complete.");
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const { data: user } = await supabase.from("users").select("*").eq("email", email.toLowerCase()).eq("isActive", true).maybeSingle();

  let debugResetUrl: string | undefined;

  if (user) {
    const issued = await issueOneTimeToken({
      userId: String(user.id),
      type: "password-reset",
      ttlMinutes: env.passwordResetTokenTtlMinutes
    });

    if (!env.nodeEnv.startsWith("prod")) {
      debugResetUrl = buildResetUrl(issued.rawToken);
    }

    await settleNonCriticalTasks("forgot-password-audit", [
      recordAuditEvent({
        actorId: String(user.id),
        actorRole: user.role,
        action: "auth.password-reset.requested",
        entityType: "user",
        entityId: String(user.id),
        targetUserId: String(user.id),
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        requestId: req.requestId
      })
    ]);
  }

  ok(
    res,
    {
      resetRequested: true,
      ...(debugResetUrl ? { debugResetUrl } : {})
    },
    "If the account exists, password reset instructions have been prepared."
  );
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token: string; password: string };
  const authToken = await consumeOneTimeToken("password-reset", token);
  const { data: user } = await supabase.from("users").select("*").eq("id", authToken.userId).maybeSingle();

  if (!user || !user.isActive) {
    throw new ApiError(404, "User not found.");
  }

  user.password = await bcrypt.hash(password, 12);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  
  await supabase.from("users").update({
    password: user.password,
    tokenVersion: user.tokenVersion,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil
  }).eq("id", user.id);

  res.clearCookie(env.cookieName, buildCookieOptions());
  await settleNonCriticalTasks("reset-password-audit", [
    recordAuditEvent({
      actorId: String(user.id),
      actorRole: user.role,
      action: "auth.password-reset.completed",
      entityType: "user",
      entityId: String(user.id),
      targetUserId: String(user.id),
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      requestId: req.requestId
    })
  ]);

  ok(res, { passwordReset: true }, "Password reset successfully.");
}

export async function createInviteForUser(userId: string, createdBy: string) {
  const issued = await issueOneTimeToken({
    userId,
    type: "invite",
    ttlMinutes: env.inviteTokenTtlMinutes,
    createdBy
  });

  return {
    inviteStatus: "created",
    setupRequired: true,
    setupUrl: buildInviteUrl(issued.rawToken),
    expiresAt: issued.expiresAt
  };
}

export async function hashPlaceholderPassword(): Promise<string> {
  return bcrypt.hash(buildUnknownPassword(), 12);
}
