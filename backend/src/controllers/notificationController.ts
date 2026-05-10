import type { Request, Response } from "express";

import { NotificationModel } from "../models/Notification.js";
import { ok, ApiError } from "../utils/http.js";

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const recipientId = req.user?.id;

  if (!recipientId) {
    throw new ApiError(401, "Authentication required.");
  }

  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));
  const skip = (page - 1) * pageSize;

  const [total, unreadCount, notifications] = await Promise.all([
    NotificationModel.countDocuments({ recipientId }),
    NotificationModel.countDocuments({ recipientId, read: false }),
    NotificationModel.find({ recipientId }).sort({ createdAt: -1 }).skip(skip).limit(pageSize)
  ]);

  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

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
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user?.id },
    { read: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found.");
  }

  ok(res, { notification }, "Notification marked as read.");
}
