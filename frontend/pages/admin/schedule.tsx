import { useState, FormEvent } from "react";
import { LoadingPanel } from "@/components/LoadingPanel";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { SectionCard } from "@/components/SectionCard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/utils/api";
import type { Schedule, ManagedUser } from "@/utils/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function AdminSchedulePage() {
  const { status } = useRequireAuth(["admin"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    class: "",
    subject: "",
    teacher_id: "",
    start_time: "",
    end_time: "",
    type: "regular" as const
  });

  const {
    data: scheduleData,
    error: loadError,
    mutate
  } = useApi<{ schedules: Schedule[] }>(
    status === "authenticated" ? `/schedules` : null
  );

  const { data: teachersData } = useApi<{ users: ManagedUser[] }>(
    status === "authenticated" ? `/admin/users?role=teacher&pageSize=100` : null
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch("/schedules", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString()
        })
      });
      setSuccess("Schedule created successfully!");
      setFormData({
        class: "",
        subject: "",
        teacher_id: "",
        start_time: "",
        end_time: "",
        type: "regular"
      });
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await apiFetch(`/schedules/${id}`, { method: "DELETE" });
      await mutate();
    } catch (err) {
      alert("Failed to delete schedule.");
    }
  };

  if (status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading schedule management..." />;
  }

  if (loadError) {
    return (
      <DashboardLayout title="Schedule Management" subtitle="Manage classes and exams">
        <LoadFailurePanel message={loadError.message} onRetry={() => void mutate()} />
      </DashboardLayout>
    );
  }

  const schedules = scheduleData?.schedules || [];
  const teachers = teachersData?.users || [];

  return (
    <DashboardLayout
      title="Schedule Management"
      subtitle="Manage offline classes, exams, and holidays for all batches."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: List of Schedules */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="All Schedules">
            {schedules.length === 0 ? (
              <p className="text-sm text-text-light">No schedules found.</p>
            ) : (
              <div className="space-y-4">
                {schedules.map(schedule => {
                  const startTime = new Date(schedule.start_time).toLocaleString();
                  const endTime = new Date(schedule.end_time).toLocaleTimeString();
                  
                  return (
                    <div key={schedule.id} className="flex items-center justify-between rounded-lg border border-soft p-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-text-main">{schedule.subject} (Class {schedule.class})</h4>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            schedule.type === 'exam' ? 'bg-red-100 text-red-700' :
                            schedule.type === 'holiday' ? 'bg-green-100 text-green-700' :
                            'bg-[var(--surface-accent)] text-[var(--primary)]'
                          }`}>
                            {schedule.type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-text-light mb-1">Instructor: {schedule.teacher?.name || "N/A"}</p>
                        <p className="text-sm text-text-light font-medium">
                          {startTime} - {endTime}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Create Form */}
        <div>
          <SectionCard title="Add Schedule">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">Class / Batch</label>
                <input
                  type="text"
                  required
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className="w-full rounded-md border border-soft p-2"
                  placeholder="e.g. 10A"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full rounded-md border border-soft p-2"
                  placeholder="e.g. Mathematics"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">Teacher</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full rounded-md border border-soft p-2"
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full rounded-md border border-soft p-2"
                >
                  <option value="regular">Regular Class</option>
                  <option value="exam">Exam</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full rounded-md border border-soft p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full rounded-md border border-soft p-2"
                />
              </div>

              {error && <div className="text-sm text-[var(--danger)]">{error}</div>}
              {success && <div className="text-sm text-green-600">{success}</div>}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-[var(--primary)] py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Schedule"}
              </button>
            </form>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
