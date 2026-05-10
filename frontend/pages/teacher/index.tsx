import Link from "next/link";
import { CalendarDays, GraduationCap, LayoutGrid } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { apiFetch } from "@/utils/api";
import type { CurrentUser } from "@/utils/types";

export default function TeacherDashboardPage() {
  const { user, status, error } = useRequireAuth(["teacher"]);
  const [students, setStudents] = useState<CurrentUser[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      void apiFetch<{ students: CurrentUser[] }>("/teacher/students")
        .then((result) => {
          setStudents(result.students);
          setLoadError("");
        })
        .catch((teacherLoadError) => {
          setStudents([]);
          setLoadError(teacherLoadError instanceof Error ? teacherLoadError.message : "Unable to load the teacher roster.");
        });
    }
  }, [status]);

  const classCount = useMemo(() => new Set(students.map((student) => student.class)).size, [students]);

  if (!user || status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading teacher workspace..." />;
  }

  if (status === "error") {
    return <LoadFailurePanel title="Teacher access could not be verified" message={error || "The teacher workspace could not confirm your current session."} onRetry={() => window.location.reload()} />;
  }

  if (loadError) {
    return <LoadFailurePanel message={loadError} onRetry={() => window.location.reload()} />;
  }

  return (
    <DashboardLayout
      title="Teaching operations"
      subtitle="Move quickly between class visibility, attendance capture, and student readiness."
      actions={
        <Link className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white" href="/teacher/attendance">
          Mark attendance
        </Link>
      }
    >
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          description="Students visible to your teaching workspace"
          icon={<GraduationCap size={20} />}
          label="Student roster"
          value={students.length}
        />
        <StatCard
          description="Classes represented in the current roster"
          icon={<LayoutGrid size={20} />}
          label="Classes"
          value={classCount}
        />
        <StatCard
          description="Open attendance workflow ready for today's session"
          icon={<CalendarDays size={20} />}
          label="Action"
          value="Ready"
        />
      </div>

      <SectionCard title="Student overview" eyebrow="Today's teaching surface">
        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.id} className="rounded-[1.2rem] border border-soft p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-sm text-muted">
                    Class {student.class} · {student.email}
                  </p>
                </div>
                <span className="rounded-full bg-[rgba(15,61,46,0.08)] px-3 py-1 text-xs text-[var(--primary)]">
                  Active student
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </DashboardLayout>
  );
}
