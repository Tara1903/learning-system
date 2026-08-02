import type { PropsWithChildren, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { BrainCircuit, CalendarCheck2, ChartColumnBig, Home, LogOut, Users2 } from "lucide-react";

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
    { href: "/admin", label: "Overview", icon: <Home size={20} /> },
    { href: "/admin/users", label: "Users", icon: <Users2 size={20} /> }
  ],
  teacher: [
    { href: "/teacher", label: "Overview", icon: <Home size={20} /> },
    { href: "/teacher/attendance", label: "Attendance", icon: <CalendarCheck2 size={20} /> }
  ],
  student: [
    { href: "/student", label: "Overview", icon: <Home size={20} /> },
    { href: "/student/chat", label: "AI Teacher", icon: <BrainCircuit size={20} /> },
    { href: "/student/attendance", label: "Attendance", icon: <CalendarCheck2 size={20} /> },
    { href: "/student/analytics", label: "Analytics", icon: <ChartColumnBig size={20} /> }
  ],
  parent: [
    { href: "/parent", label: "Overview", icon: <Home size={20} /> }
  ]
};

// Returns a two-letter initial for the avatar fallback
function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name[0] || "U").toUpperCase();
}

export function DashboardLayout({ title, subtitle, actions, children }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  if (!user) {
    return null;
  }

  // Determine dynamic themes based on user role
  let themeGradient = "from-[var(--primary)]/10 via-[var(--background)] to-[var(--accent)]/10";
  let activeNavClass = "bg-[var(--accent)]/10 text-[var(--accent)]";
  
  if (user.role === "student") {
    themeGradient = "from-purple-500/10 via-[var(--background)] to-cyan-500/10";
    activeNavClass = "bg-purple-500/10 text-purple-600 dark:text-purple-400";
  } else if (user.role === "parent") {
    themeGradient = "from-blue-500/10 via-[var(--background)] to-teal-500/10";
    activeNavClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  }

  return (
    <div className={`relative flex min-h-screen bg-[var(--background)] selection:bg-[var(--accent)] selection:text-white print:bg-white`}>
      {/* Background Animated Orbs (Hidden in print mode) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 print:hidden">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br ${themeGradient} blur-[120px] opacity-70`} />
        <div className={`absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tl ${themeGradient} blur-[100px] opacity-60`} />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[280px] shrink-0 border-r border-soft bg-surface/50 backdrop-blur-xl z-20 print:hidden p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[var(--primary)] text-white border border-[var(--primary)]/20 shadow-sm flex items-center justify-center">
            <span className="font-bold text-2xl heading-serif">A</span>
          </div>
          <div>
            <p className="font-bold text-[17px] tracking-wider text-[var(--text)] uppercase">Adhyayan</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium">Brilliant Classes</p>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-4 rounded-[1.5rem] bg-surface-strong border border-soft p-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white flex items-center justify-center font-bold text-lg shadow-inner">
            {getInitials(user.name)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <RoleBadge role={user.role} />
            </div>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-2">
          {navByRole[user.role].map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all ${
                  active
                    ? activeNavClass
                    : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                href={item.href}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[1.5rem] border border-soft bg-surface-strong p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted font-semibold">Premium Platform</p>
          <p className="mt-2 text-xs leading-5 text-muted">
            The next generation of AI-powered classroom continuity.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 w-full pt-[env(safe-area-inset-top)]">
        
        {/* Desktop Sticky Top Bar */}
        <header className="hidden md:flex sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-soft px-8 py-4 justify-between items-center print:hidden">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold heading-serif truncate">{title}</h1>
            <p className="text-xs text-muted mt-1 truncate">{subtitle}</p>
          </div>
          
          <div className="flex items-center gap-4 ml-4">
            {actions && <div>{actions}</div>}
            <NotificationCenter />
            <ThemeToggle />
            <button
              className="flex items-center gap-2 rounded-full border border-soft bg-surface-strong px-4 py-2 text-sm font-medium transition hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20"
              onClick={() => void logout().then(() => router.push("/login"))}
              title="Logout"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Native Mobile Header (iOS/Android Style) */}
        <header className="md:hidden sticky top-0 z-40 h-14 bg-surface/90 backdrop-blur-xl border-b-[0.5px] border-black/10 dark:border-white/10 flex items-center justify-between px-4 print:hidden shadow-sm">
          {/* Left space for balance or future back button */}
          <div className="flex-1" />
          
          {/* Absolutely Centered Title */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
            <h1 className="text-[17px] font-semibold tracking-tight text-center truncate max-w-[200px]">{title}</h1>
          </div>
          
          {/* Right Actions */}
          <div className="flex-1 flex justify-end items-center gap-4">
            <NotificationCenter />
          </div>
        </header>

        {/* Mobile Subtitle & Actions */}
        {(subtitle || actions) && (
          <div className="md:hidden px-4 pt-4 pb-1 print:hidden">
             {subtitle && <p className="text-[13px] leading-snug text-muted mb-3">{subtitle}</p>}
             {actions && <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">{actions}</div>}
          </div>
        )}

        {/* Page Content - No padding on mobile for edge-to-edge Native feel */}
        <main className="flex-1 p-0 md:p-8 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-8 w-full overflow-x-hidden">
          <MotionReveal>
            <div className="space-y-6 md:space-y-6">
              {children}
            </div>
          </MotionReveal>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (iOS/Android Native Style) */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-surface/90 backdrop-blur-2xl border-t-[0.5px] border-black/10 dark:border-white/10 pb-[env(safe-area-inset-bottom)] print:hidden">
        <div className="flex justify-around items-center px-1 py-1">
          {navByRole[user.role].map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`flex flex-col items-center justify-center p-1 min-w-[64px] h-[48px] rounded-none transition-none ${
                  active ? "text-[var(--accent)]" : "text-muted"
                }`}
                href={item.href}
              >
                {item.icon}
                <span className="text-[10px] font-medium mt-1 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
