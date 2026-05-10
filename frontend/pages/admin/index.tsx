import Link from "next/link";
import { BarChart3, ShieldCheck, UsersRound, Waves } from "lucide-react";
import { useEffect, useState } from "react";

import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { MotionReveal } from "@/components/MotionReveal";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { apiFetch } from "@/utils/api";

interface AdminAnalytics {
  roleCounts: Record<string, number>;
  attendanceCount: number;
  doubtCount: number;
  averageAttendance: number;
  atRiskStudents: number;
  topWeakTopics: Array<{ topic: string; count: number }>;
}

export default function AdminDashboardPage() {
  const { user, status, error } = useRequireAuth(["admin"]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      void apiFetch<AdminAnalytics>("/admin/analytics")
        .then((result) => {
          setAnalytics(result);
          setLoadError("");
        })
        .catch((loadAnalyticsError) => {
          setAnalytics(null);
          setLoadError(loadAnalyticsError instanceof Error ? loadAnalyticsError.message : "Unable to load institute analytics.");
        });
    }
  }, [status]);

  if (!user || status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading admin workspace..." />;
  }

  if (status === "error") {
    return <LoadFailurePanel title="Admin access could not be verified" message={error || "The admin dashboard could not confirm your current session."} onRetry={() => window.location.reload()} />;
  }

  return (
    <DashboardLayout
      title="Institution command centre"
      subtitle="Track provisioning, risk signals, and learning operations from one premium oversight layer."
      actions={
        <>
          <Link className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white" href="/admin/users?create=student">
            Register student
          </Link>
          <Link className="rounded-full border border-soft bg-surface px-4 py-2 text-sm" href="/admin/users">
            Manage users
          </Link>
        </>
      }
    >
      {analytics ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MotionReveal delay={0}>
              <StatCard
                description="Students currently managed in the institute"
                icon={<UsersRound size={22} />}
                label="Students"
                value={analytics.roleCounts.student ?? 0}
              />
            </MotionReveal>
            <MotionReveal delay={0.08}>
              <StatCard
                description="Teachers managing classes and attendance"
                icon={<ShieldCheck size={22} />}
                label="Teachers"
                value={analytics.roleCounts.teacher ?? 0}
              />
            </MotionReveal>
            <MotionReveal delay={0.16}>
              <StatCard
                description="Institute-wide attendance strength"
                icon={<BarChart3 size={22} />}
                label="Avg. Attendance"
                value={`${analytics.averageAttendance}%`}
              />
            </MotionReveal>
            <MotionReveal delay={0.24}>
              <StatCard
                description="Students currently needing intervention"
                icon={<Waves size={22} />}
                label="At-Risk Learners"
                value={analytics.atRiskStudents}
              />
            </MotionReveal>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard
              title="Provisioning shortcuts"
              eyebrow="Fast actions"
              action={
                <Link className="rounded-full border border-soft px-4 py-2 text-sm" href="/admin/users">
                  Open full user management
                </Link>
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Link
                  className="rounded-[1.4rem] border border-soft bg-surface p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
                  href="/admin/users?create=student"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">Student</p>
                  <p className="mt-3 text-lg font-semibold">Register a new student</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Create a student account, set class details, and issue the setup link in one flow.
                  </p>
                </Link>

                <Link
                  className="rounded-[1.4rem] border border-soft bg-surface p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
                  href="/admin/users?create=teacher"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">Teacher</p>
                  <p className="mt-3 text-lg font-semibold">Add a teacher</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Provision classroom staff and prepare attendance access without leaving the admin workspace.
                  </p>
                </Link>

                <Link
                  className="rounded-[1.4rem] border border-soft bg-surface p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
                  href="/admin/users?create=parent"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">Parent</p>
                  <p className="mt-3 text-lg font-semibold">Link a parent account</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Create a parent login and connect it to one or more student accounts for visibility.
                  </p>
                </Link>
              </div>
            </SectionCard>

            <SectionCard title="Institute pulse" eyebrow="Operations summary">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.4rem] border border-soft p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Attendance records</p>
                  <p className="mt-3 text-3xl font-semibold">{analytics.attendanceCount}</p>
                </div>
                <div className="rounded-[1.4rem] border border-soft p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">AI doubt sessions</p>
                  <p className="mt-3 text-3xl font-semibold">{analytics.doubtCount}</p>
                </div>
                <div className="rounded-[1.4rem] border border-soft p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Parents linked</p>
                  <p className="mt-3 text-3xl font-semibold">{analytics.roleCounts.parent ?? 0}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Weak topic radar" eyebrow="Intervention priorities">
              <div className="space-y-3">
                {analytics.topWeakTopics.length ? (
                  analytics.topWeakTopics.map((topic) => (
                    <div key={topic.topic} className="rounded-[1.2rem] border border-soft p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium capitalize">{topic.topic}</p>
                        <span className="rounded-full bg-[rgba(212,175,55,0.14)] px-3 py-1 text-xs text-[var(--accent)]">
                          {topic.count} flags
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">Weak-topic analytics will appear once doubt activity begins.</p>
                )}
              </div>
            </SectionCard>
          </div>
        </>
      ) : loadError ? (
        <LoadFailurePanel message={loadError} onRetry={() => window.location.reload()} />
      ) : (
        <LoadingPanel label="Fetching institute analytics..." />
      )}
    </DashboardLayout>
  );
}
