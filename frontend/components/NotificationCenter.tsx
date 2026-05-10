import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { apiFetch } from "@/utils/api";
import type { NotificationItem, PaginationMeta } from "@/utils/types";

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  async function loadNotifications(page = 1, append = false) {
    const result = await apiFetch<{
      notifications: NotificationItem[];
      unreadCount: number;
      pagination: PaginationMeta;
    }>(`/notifications?page=${page}&pageSize=10`);

    setUnreadCount(result.unreadCount);
    setPagination(result.pagination);
    setNotifications((current) => (append ? [...current, ...result.notifications] : result.notifications));
  }

  useEffect(() => {
    void loadNotifications().catch(() => {
      setNotifications([]);
      setPagination(null);
      setUnreadCount(0);
    });
  }, []);

  async function markRead(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((current) =>
      current.map((notification) => (notification._id === id ? { ...notification, read: true } : notification))
    );
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  return (
    <div className="relative">
      <button
        className="relative rounded-full border border-soft bg-surface px-3 py-2"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-black">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="app-shell-card absolute right-0 z-20 mt-3 w-[320px] rounded-[1.5rem] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="heading-serif text-xl">Notifications</h3>
            <span className="text-xs uppercase tracking-[0.2em] text-muted">Institute</span>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {notifications.length ? (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  className={`w-full rounded-2xl border p-3 text-left ${notification.read ? "border-soft bg-transparent" : "border-[rgba(212,175,55,0.22)] bg-[rgba(212,175,55,0.08)]"}`}
                  onClick={() => void markRead(notification._id)}
                  type="button"
                >
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="mt-1 text-sm text-muted">{notification.message}</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted">No notifications yet.</p>
            )}
          </div>

          {pagination?.hasNextPage ? (
            <button
              className="mt-4 w-full rounded-full border border-soft px-4 py-2 text-sm"
              onClick={() => void loadNotifications((pagination.page || 1) + 1, true)}
              type="button"
            >
              Load more
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
