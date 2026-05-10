import Link from "next/link";
import { Shield, UserRoundSearch } from "lucide-react";
import { useEffect, useState } from "react";

import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { apiFetch } from "@/utils/api";
import type { AnalyticsSummary } from "@/utils/types";

interface ParentDashboardData {
  parent: { id: string; name: string; email: string };
  students: Array<{
    id: string;
    name: string;
    class?: string;
    analytics: AnalyticsSummary;
    recommendations: string[];
  }>;
}

export default function ParentDashboardPage() {
  const { user, status, error } = useRequireAuth(["parent"]);
  const [dashboard, setDashboard] = useState<ParentDashboardData | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      void apiFetch<ParentDashboardData>("/parent/dashboard")
        .then((result) => {
          setDashboard(result);
          setLoadError("");
        })
        .catch((parentLoadError) => {
          setDashboard(null);
          setLoadError(parentLoadError instanceof Error ? parentLoadError.message : "Unable to load family insights.");
        });
    }
  }, [status]);

  if (!user || status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading parent dashboard..." />;
  }

  if (status === "error") {
    return <LoadFailurePanel title="Parent access could not be verified" message={error || "The parent dashboard could not confirm your current session."} onRetry={() => window.location.reload()} />;
  }

  return (
    <DashboardLayout
      title="Parent monitoring suite"
      subtitle="Track attendance, performance risk, and study support recommendations for linked students."
    >
      {dashboard ? (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            <StatCard
              description="Students linked to your account"
              icon={<UserRoundSearch size={20} />}
              label="Linked students"
              value={dashboard.students.length}
            />
            <StatCard
              description="Guided support reminders across linked learners"
              icon={<Shield size={20} />}
              label="Parent support"
              value="Active"
            />
          </div>

          <SectionCard title="Student summaries" eyebrow="Family learning visibility">
            <div className="space-y-4">
              {dashboard.students.map((student) => (
                <div key={student.id} className="rounded-[1.4rem] border border-soft p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold">{student.name}</p>
                      <p className="text-sm text-muted">Class {student.class}</p>
                      <p className="mt-3 text-sm text-muted">
                        Attendance {student.analytics?.attendancePercentage ?? 0}% · Practice {student.analytics?.practiceAccuracy ?? 0}%
                      </p>
                    </div>
                    <Link className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white" href={`/parent/student/${student.id}`}>
                      Open details
                    </Link>
                  </div>
                  <div className="mt-4 space-y-2">
                    {student.recommendations.map((recommendation) => (
                      <div key={recommendation} className="rounded-[1rem] border border-soft p-3 text-sm text-muted">
                        {recommendation}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      ) : loadError ? (
        <LoadFailurePanel message={loadError} onRetry={() => window.location.reload()} />
      ) : (
        <LoadingPanel label="Fetching family insights..." />
      )}
    </DashboardLayout>
  );
}
