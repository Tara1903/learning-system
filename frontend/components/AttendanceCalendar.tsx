import type { AttendanceRecord } from "@/utils/types";

const statusClassMap = {
  present: "bg-emerald-500/20 text-emerald-700",
  absent: "bg-rose-500/20 text-rose-700",
  late: "bg-amber-500/20 text-amber-700"
} as const;

export function AttendanceCalendar({ records }: { records: AttendanceRecord[] }) {
  const latest = records.slice(0, 30).reverse();

  return (
    <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 lg:grid-cols-10">
      {latest.map((record) => (
        <div
          key={record._id}
          className={`rounded-2xl border border-soft p-3 text-center ${statusClassMap[record.status]}`}
        >
          <p className="text-xs font-medium uppercase">{new Date(record.date).toLocaleDateString("en-IN", { day: "2-digit" })}</p>
          <p className="mt-1 text-[11px]">{record.status}</p>
        </div>
      ))}
    </div>
  );
}

