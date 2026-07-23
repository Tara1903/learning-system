import type { Request, Response } from "express";

import { supabase } from '../config/db.js';
import { ok, ApiError } from "../utils/http.js";

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const recipientId = req.user?.id;

  if (!recipientId) {
    throw new ApiError(401, "Authentication required.");
  }

  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));
  const skip = (page - 1) * pageSize;

  const [
    { count: total, error: totalError },
    { count: unreadCount, error: unreadError },
    { data: notifications, error: notificationsError }
  ] = await Promise.all([
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipientId', recipientId),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipientId', recipientId).eq('read', false),
    supabase.from('notifications').select('*').eq('recipientId', recipientId).order('createdAt', { ascending: false }).range(skip, skip + pageSize - 1)
  ]);

  if (totalError) throw new ApiError(500, "Database error: " + totalError.message);
  if (unreadError) throw new ApiError(500, "Database error: " + unreadError.message);
  if (notificationsError) throw new ApiError(500, "Database error: " + notificationsError.message);

  const totalPages = (total ?? 0) > 0 ? Math.ceil((total ?? 0) / pageSize) : 0;

  ok(res, {
    notifications,
    unreadCount,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: totalPages > 0 && page < totalPages,
      hasPreviousPage: page > 1
    }
  });
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const { data: notification, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', req.params.id)
    .eq('recipientId', req.user?.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ApiError(404, "Notification not found.");
    }
    throw new ApiError(500, "Database error: " + error.message);
  }

  ok(res, { notification }, "Notification marked as read.");
}
