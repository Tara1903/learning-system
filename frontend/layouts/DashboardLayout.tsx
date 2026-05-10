import type { PropsWithChildren, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { BookOpenCheck, BrainCircuit, CalendarCheck2, ChartColumnBig, Home, LogOut, ShieldCheck, Users2 } from "lucide-react";

import { MotionReveal } from "@/components/MotionReveal";
import { NotificationCenter } from "@/components/NotificationCenter";
import { RoleBadge } from "@/components/RoleBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/utils/types";

interface DashboardLayoutProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

const navByRole: Record<UserRole, Array<{ href: string; label: string; icon: ReactNode }>> = {
  admin: [
    { href: "/admin", label: "Overview", icon: <Home size={18} /> },
    { href: "/admin/users", label: "User Management", icon: <Users2 size={18} /> }
  ],
  teacher: [
    { href: "/teacher", label: "Overview", icon: <Home size={18} /> },
    { href: "/teacher/attendance", label: "Attendance", icon: <CalendarCheck2 size={18} /> }
  ],
  student: [
    { href: "/student", label: "Overview", icon: <Home size={18} /> },
    { href: "/student/chat", label: "AI Teacher", icon: <BrainCircuit size={18} /> },
    { href: "/student/attendance", label: "Attendance", icon: <CalendarCheck2 size={18} /> },
    { href: "/student/analytics", label: "Analytics", icon: <ChartColumnBig size={18} /> }
  ],
  parent: [
    { href: "/parent", label: "Overview", icon: <Home size={18} /> }
  ]
};

export function DashboardLayout({ title, subtitle, actions, children }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 md:px-6">
      <aside className="app-shell-card hidden w-[280px] shrink-0 rounded-[2rem] p-5 lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[rgba(212,175,55,0.16)] p-3 text-[var(--accent)]">
            <BookOpenCheck size={20} />
          </div>
          <div>
            <p className="heading-serif text-2xl">Adhyayan</p>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Learning System</p>
          </div>
        </div>

        <div className="mt-8 rounded-[1.6rem] border border-soft bg-surface-strong p-4">
          <p className="text-sm font-semibold">{user.name}</p>
          <div className="mt-3 flex items-center gap-2">
            <RoleBadge role={user.role} />
            {user.class ? <span className="text-xs text-muted">Class {user.class}</span> : null}
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-2">
          {navByRole[user.role].map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                  active
                    ? "bg-[rgba(212,175,55,0.14)] text-[var(--accent)]"
                    : "text-[var(--text)] hover:bg-[rgba(15,61,46,0.08)]"
                }`}
                href={item.href}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-[1.5rem] border border-soft bg-[linear-gradient(135deg,rgba(212,175,55,0.12),transparent)] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Institution mode</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Designed for premium classroom continuity, guided learning, and parent confidence.
          </p>
        </div>
      </aside>

      <main className="flex-1">
        <MotionReveal className="app-shell-card rounded-[2rem] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted">Adhyayan Workspace</p>
              <h1 className="heading-serif mt-2 text-3xl md:text-4xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {actions}
              <NotificationCenter />
              <ThemeToggle />
              <button
                className="rounded-full border border-soft bg-surface px-4 py-2 text-sm"
                onClick={() => void logout().then(() => router.push("/login"))}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <LogOut size={16} />
                  Logout
                </span>
              </button>
            </div>
          </div>
        </MotionReveal>

        <div className="mt-6 space-y-6">{children}</div>
      </main>
    </div>
  );
}
