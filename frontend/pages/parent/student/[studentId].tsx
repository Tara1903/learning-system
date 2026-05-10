import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { SectionCard } from "@/components/SectionCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { apiFetch } from "@/utils/api";
import type { AnalyticsSummary, AttendanceRecord } from "@/utils/types";

export default function ParentStudentDetailPage() {
  const router = useRouter();
  const { studentId } = router.query;
  const { user, status, error } = useRequireAuth(["parent"]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status === "authenticated" && typeof studentId === "string") {
      void apiFetch<{ analytics: AnalyticsSummary; recommendations: string[] }>(`/parent/student/${studentId}/analytics`)
        .then((result) => {
          setAnalytics(result.analytics);
          setRecommendations(result.recommendations);
          setLoadError("");
        })
        .catch((analyticsError) => {
          setAnalytics(null);
          setLoadError(analyticsError instanceof Error ? analyticsError.message : "Unable to load student analytics.");
        });

      void apiFetch<{ records: AttendanceRecord[] }>(`/parent/student/${studentId}/attendance`)
        .then((result) => setAttendance(result.records))
        .catch(() => setAttendance([]));
    }
  }, [status, studentId]);

  if (!user || status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading parent detail view..." />;
  }

  if (status === "error") {
    return <LoadFailurePanel title="Parent access could not be verified" message={error || "The parent detail view could not confirm your current session."} onRetry={() => window.location.reload()} />;
  }

  return (
    <DashboardLayout
      title="Student detail"
      subtitle="A parent-safe view of attendance rhythm, weak-topic pressure, and guided support suggestions."
    >
      {analytics ? (
        <>
          <SectionCard title="Performance overview" eyebrow="Student analytics">
            <AnalyticsCharts analytics={analytics} attendance={attendance} />
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard title="Attendance timeline" eyebrow="Recent sessions">
              <AttendanceCalendar records={attendance} />
            </SectionCard>

            <SectionCard title="Recommended support" eyebrow="Parent actions">
              <div className="space-y-3">
                {recommendations.map((recommendation) => (
                  <div key={recommendation} className="rounded-[1.2rem] border border-soft p-4 text-sm text-muted">
                    {recommendation}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : loadError ? (
        <LoadFailurePanel message={loadError} onRetry={() => window.location.reload()} />
      ) : (
        <LoadingPanel label="Fetching student detail..." />
      )}
    </DashboardLayout>
  );
}
