import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";

import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { apiFetch } from "@/utils/api";
import type { AttendanceRecord } from "@/utils/types";

export default function StudentAttendancePage() {
  const { user, status, error } = useRequireAuth(["student"]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [percentage, setPercentage] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      void apiFetch<{ records: AttendanceRecord[]; percentage: number }>("/student/attendance")
        .then((result) => {
          setRecords(result.records);
          setPercentage(result.percentage);
          setLoadError("");
        })
        .catch((attendanceError) => {
          setRecords([]);
          setPercentage(0);
          setLoadError(attendanceError instanceof Error ? attendanceError.message : "Unable to load attendance history.");
        });
    }
  }, [status]);

  if (!user || status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading attendance history..." />;
  }

  if (status === "error") {
    return <LoadFailurePanel title="Student access could not be verified" message={error || "Attendance history could not confirm your session."} onRetry={() => window.location.reload()} />;
  }

  if (loadError) {
    return <LoadFailurePanel message={loadError} onRetry={() => window.location.reload()} />;
  }

  return (
    <DashboardLayout
      title="Attendance story"
      subtitle="Transparent day-by-day visibility so students and parents can maintain strong classroom continuity."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <StatCard
          description="Your present and late sessions combined"
          icon={<CalendarClock size={20} />}
          label="Attendance percentage"
          value={`${percentage}%`}
        />
      </div>

      <SectionCard title="Last 30 sessions" eyebrow="Attendance calendar">
        <AttendanceCalendar records={records} />
      </SectionCard>
    </DashboardLayout>
  );
}
