import { useState } from "react";
import { LoadingPanel } from "@/components/LoadingPanel";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { SectionCard } from "@/components/SectionCard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { Schedule } from "@/utils/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function StudentSchedulePage() {
  const { status } = useRequireAuth(["student", "parent"]);

  const {
    data: scheduleData,
    error: loadError,
    mutate
  } = useApi<{ schedules: Schedule[] }>(
    status === "authenticated" ? `/schedules` : null
  );

  if (status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading schedule..." />;
  }

  if (loadError) {
    return (
      <DashboardLayout title="Class Schedule" subtitle="View upcoming classes">
        <LoadFailurePanel message={loadError.message} onRetry={() => void mutate()} />
      </DashboardLayout>
    );
  }

  const schedules = scheduleData?.schedules || [];

  // Group schedules by date
  const groupedSchedules = schedules.reduce((acc, schedule) => {
    const dateStr = new Date(schedule.start_time).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(schedule);
    return acc;
  }, {} as Record<string, Schedule[]>);

  return (
    <DashboardLayout
      title="Class Schedule"
      subtitle="View your upcoming classes, exams, and holidays."
    >
      <div className="max-w-4xl space-y-8">
        {Object.keys(groupedSchedules).length === 0 ? (
          <SectionCard title="Upcoming Schedule">
            <p className="text-sm text-text-light py-8 text-center">No upcoming classes scheduled.</p>
          </SectionCard>
        ) : (
          Object.entries(groupedSchedules).map(([dateStr, daySchedules]) => (
            <SectionCard key={dateStr} title={dateStr}>
              <div className="space-y-4">
                {daySchedules.map(schedule => {
                  const startTime = new Date(schedule.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  const endTime = new Date(schedule.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  
                  let badgeColor = "bg-[var(--surface-accent)] text-[var(--primary)]";
                  if (schedule.type === "exam") badgeColor = "bg-red-100 text-red-700";
                  if (schedule.type === "holiday") badgeColor = "bg-green-100 text-green-700";

                  return (
                    <div key={schedule.id} className="flex items-center justify-between rounded-lg border border-soft p-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-text-main">{schedule.subject}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
                            {schedule.type.toUpperCase()}
                          </span>
                        </div>
                        {schedule.teacher?.name && (
                          <p className="text-sm text-text-light mb-1">Instructor: {schedule.teacher.name}</p>
                        )}
                        <p className="text-sm text-text-light font-medium">
                          {startTime} - {endTime}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
