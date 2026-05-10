import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { AnalyticsSummary, AttendanceRecord } from "@/utils/types";

interface AnalyticsChartsProps {
  analytics: AnalyticsSummary | null;
  attendance?: AttendanceRecord[];
}

export function AnalyticsCharts({ analytics, attendance = [] }: AnalyticsChartsProps) {
  const metricData = [
    { label: "Attendance", value: analytics?.attendancePercentage ?? 0 },
    { label: "Practice", value: analytics?.practiceAccuracy ?? 0 },
    { label: "Doubts", value: analytics?.doubtCount ?? 0 }
  ];

  const attendanceSeries = attendance
    .slice(0, 10)
    .reverse()
    .map((record) => ({
      day: new Date(record.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      score: record.status === "present" ? 100 : record.status === "late" ? 70 : 0
    }));

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[1.5rem] border border-soft p-4">
        <p className="mb-4 text-xs uppercase tracking-[0.22em] text-muted">Learning rhythm</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceSeries}>
              <defs>
                <linearGradient id="attendanceGlow" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0F3D2E" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#0F3D2E" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(15,61,46,0.08)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-text)" />
              <YAxis stroke="var(--muted-text)" />
              <Tooltip />
              <Area type="monotone" dataKey="score" stroke="#0F3D2E" fill="url(#attendanceGlow)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-soft p-4">
        <p className="mb-4 text-xs uppercase tracking-[0.22em] text-muted">Performance composition</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metricData}>
              <CartesianGrid stroke="rgba(15,61,46,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted-text)" />
              <YAxis stroke="var(--muted-text)" />
              <Tooltip />
              <Bar dataKey="value" fill="#D4AF37" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

