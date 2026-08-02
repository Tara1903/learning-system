import { FormEvent, useEffect, useMemo, useState } from "react";

import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { SectionCard } from "@/components/SectionCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { apiFetch } from "@/utils/api";
import type { CurrentUser } from "@/utils/types";

type StatusMap = Record<string, "present" | "absent" | "late">;

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function TeacherAttendancePage() {
  const { user, status, error } = useRequireAuth(["teacher"]);
  const [students, setStudents] = useState<CurrentUser[]>([]);
  const [loadError, setLoadError] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(formatDateInput(new Date()));
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      void apiFetch<{ students: CurrentUser[] }>("/teacher/students")
        .then((result) => {
          setStudents(result.students);
          setLoadError("");
          setStatusMap(
            result.students.reduce<StatusMap>((acc, student) => {
              acc[student.id] = acc[student.id] ?? "present";
              return acc;
            }, {})
          );
        })
        .catch((studentLoadError) => {
          setStudents([]);
          setLoadError(studentLoadError instanceof Error ? studentLoadError.message : "Unable to load attendance students.");
        });
    }
  }, [status]);

  const [batchFilter, setBatchFilter] = useState("");
  const [mediumFilter, setMediumFilter] = useState("");
  
  const availableClasses = useMemo(
    () => Array.from(new Set(students.map((student) => student.class).filter(Boolean))).sort(),
    [students]
  );

  const availableBatches = useMemo(
    () => Array.from(new Set(students.map((student) => student.profile?.batchTiming).filter(Boolean))).sort(),
    [students]
  );

  const availableMediums = useMemo(
    () => Array.from(new Set(students.map((student) => student.profile?.medium).filter(Boolean))).sort(),
    [students]
  );

  const visibleStudents = useMemo(
    () => students.filter((student) => {
      if (classFilter && student.class !== classFilter) return false;
      if (batchFilter && student.profile?.batchTiming !== batchFilter) return false;
      if (mediumFilter && student.profile?.medium !== mediumFilter) return false;
      return true;
    }),
    [classFilter, batchFilter, mediumFilter, students]
  );

  if (!user || status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading attendance workspace..." />;
  }

  if (status === "error") {
    return <LoadFailurePanel title="Teacher access could not be verified" message={error || "The attendance workspace could not confirm your current session."} onRetry={() => window.location.reload()} />;
  }

  if (loadError) {
    return <LoadFailurePanel message={loadError} onRetry={() => window.location.reload()} />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await apiFetch("/attendance/mark", {
        method: "POST",
        body: JSON.stringify({
          records: visibleStudents.map((student) => ({
            studentId: student.id,
            class: student.class,
            date: attendanceDate,
            status: statusMap[student.id] ?? "present"
          }))
        })
      });

      setMessage(`Attendance submitted for ${attendanceDate}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit attendance right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout
      title="Attendance command board"
      subtitle="Fast, touch-friendly attendance marking built for real classroom throughput."
    >
      <SectionCard title="Mark class attendance" eyebrow="Teacher workflow">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Attendance date</span>
              <input
                className="w-full rounded-[1.1rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) => setAttendanceDate(event.target.value)}
                type="date"
                value={attendanceDate}
              />
            </label>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Class filter</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className={`rounded-full border px-4 py-2 text-sm ${classFilter === "" ? "border-[var(--accent)] text-[var(--accent)]" : "border-soft"}`}
                    onClick={() => setClassFilter("")}
                    type="button"
                  >
                    All classes
                  </button>
                  {availableClasses.map((className) => (
                    <button
                      key={className}
                      className={`rounded-full border px-4 py-2 text-sm ${classFilter === className ? "border-[var(--accent)] text-[var(--accent)]" : "border-soft"}`}
                      onClick={() => setClassFilter(className ?? "")}
                      type="button"
                    >
                      Class {className}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">Batch Timing</p>
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="w-full rounded-[1.1rem] border border-soft bg-surface-strong px-4 py-2 text-sm outline-none"
                  >
                    <option value="">All Batches</option>
                    {availableBatches.map(batch => (
                      <option key={batch as string} value={batch as string}>{batch as string}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <p className="mb-2 text-sm font-medium">Medium</p>
                  <select
                    value={mediumFilter}
                    onChange={(e) => setMediumFilter(e.target.value)}
                    className="w-full rounded-[1.1rem] border border-soft bg-surface-strong px-4 py-2 text-sm outline-none"
                  >
                    <option value="">All Mediums</option>
                    {availableMediums.map(medium => (
                      <option key={medium as string} value={medium as string}>{medium as string}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {visibleStudents.map((student) => (
              <div key={student.id} className="grid gap-3 rounded-[1.2rem] border border-soft p-4 md:grid-cols-[1fr_180px] md:items-center">
                <div>
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-sm text-muted">
                    Class {student.class} · {student.email}
                  </p>
                </div>
                <select
                  className="rounded-[1rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                  onChange={(event) =>
                    setStatusMap((current) => ({
                      ...current,
                      [student.id]: event.target.value as "present" | "absent" | "late"
                    }))
                  }
                  value={statusMap[student.id] ?? "present"}
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            ))}
          </div>

          <button
            className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
            disabled={submitting || visibleStudents.length === 0}
            type="submit"
          >
            {submitting ? "Submitting..." : "Submit attendance"}
          </button>

          {message ? <p className="text-sm text-muted">{message}</p> : null}
        </form>
      </SectionCard>
    </DashboardLayout>
  );
}
