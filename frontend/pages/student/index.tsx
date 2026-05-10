import Link from "next/link";
import { BrainCircuit, CalendarCheck2, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandSceneSurface } from "@/components/BrandSceneSurface";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { MotionReveal } from "@/components/MotionReveal";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { apiFetch } from "@/utils/api";
import type { AnalyticsSummary, AttendanceRecord, DoubtThread } from "@/utils/types";

interface StudentDashboardData {
  student: { name: string; class?: string };
  analytics: AnalyticsSummary;
  attendance: AttendanceRecord[];
  recentDoubts: DoubtThread[];
  unreadNotifications: number;
  recommendations: string[];
}

export default function StudentDashboardPage() {
  const { user, status, error } = useRequireAuth(["student"]);
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      void apiFetch<StudentDashboardData>("/student/dashboard")
        .then((result) => {
          setDashboard(result);
          setLoadError("");
        })
        .catch((dashboardError) => {
          setDashboard(null);
          setLoadError(dashboardError instanceof Error ? dashboardError.message : "Unable to load the student dashboard.");
        });
    }
  }, [status]);

  if (!user || status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading student dashboard..." />;
  }

  if (status === "error") {
    return <LoadFailurePanel title="Student access could not be verified" message={error || "The student dashboard could not confirm your current session."} onRetry={() => window.location.reload()} />;
  }

  return (
    <DashboardLayout
      title="Learning cockpit"
      subtitle="Stay prepared between classes with guided AI, progress visibility, and focused improvement prompts."
      actions={
        <Link className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white" href="/student/chat">
          Ask AI teacher
        </Link>
      }
    >
      {dashboard ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MotionReveal>
              <StatCard
                description="Current attendance strength"
                icon={<CalendarCheck2 size={20} />}
                label="Attendance"
                value={`${dashboard.analytics.attendancePercentage}%`}
              />
            </MotionReveal>
            <MotionReveal delay={0.08}>
              <StatCard
                description="AI doubt sessions completed"
                icon={<BrainCircuit size={20} />}
                label="Doubts solved"
                value={dashboard.analytics.doubtCount}
              />
            </MotionReveal>
            <MotionReveal delay={0.16}>
              <StatCard
                description="Practice accuracy across generated sets"
                icon={<TrendingUp size={20} />}
                label="Practice accuracy"
                value={`${dashboard.analytics.practiceAccuracy}%`}
              />
            </MotionReveal>
            <MotionReveal delay={0.24}>
              <StatCard
                description="Unread support and reminders"
                icon={<Sparkles size={20} />}
                label="Live alerts"
                value={dashboard.unreadNotifications}
              />
            </MotionReveal>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard title="AI learning flow" eyebrow="Home study continuity">
              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <p className="text-sm leading-7 text-muted">
                    From classroom to homework to concept clarity, Adhyayan keeps your momentum alive. Use the AI teacher when you are stuck, then return to class already prepared.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white" href="/student/chat">
                      Open AI teacher
                    </Link>
                    <Link className="rounded-full border border-soft px-4 py-2 text-sm" href="/student/analytics">
                      View analytics
                    </Link>
                  </div>
                </div>

                <BrandSceneSurface
                  sceneUrl={process.env.NEXT_PUBLIC_STUDENT_SCENE_URL}
                  heightClassName="h-[280px]"
                  eyebrow="Concept surface"
                  title="Visual reinforcement for difficult concepts"
                  caption="Use the built-in branded learning surface by default, or plug in a trusted hosted scene later with NEXT_PUBLIC_STUDENT_SCENE_URL."
                />
              </div>
            </SectionCard>

            <SectionCard title="Recommended next steps" eyebrow="AI learning signals">
              <div className="space-y-3">
                {dashboard.recommendations.map((recommendation) => (
                  <div key={recommendation} className="rounded-[1.2rem] border border-soft p-4 text-sm leading-6 text-muted">
                    {recommendation}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Recent doubt threads" eyebrow="Latest guidance">
            <div className="space-y-3">
              {dashboard.recentDoubts.length ? (
                dashboard.recentDoubts.map((doubt) => (
                  <div key={doubt._id} className="rounded-[1.2rem] border border-soft p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{doubt.subject}</p>
                        <p className="mt-1 text-sm text-muted">{doubt.question}</p>
                      </div>
                      <span className="rounded-full bg-[rgba(212,175,55,0.12)] px-3 py-1 text-xs text-[var(--accent)]">
                        {doubt.mode}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Start your first AI doubt session to build your learning profile.</p>
              )}
            </div>
          </SectionCard>
        </>
      ) : loadError ? (
        <LoadFailurePanel message={loadError} onRetry={() => window.location.reload()} />
      ) : (
        <LoadingPanel label="Fetching learning insights..." />
      )}
    </DashboardLayout>
  );
}
