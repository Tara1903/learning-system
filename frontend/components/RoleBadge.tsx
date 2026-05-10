import type { UserRole } from "@/utils/types";

const roleColors: Record<UserRole, string> = {
  admin: "bg-[rgba(212,175,55,0.18)] text-[var(--accent)]",
  teacher: "bg-[rgba(15,61,46,0.12)] text-[var(--primary)]",
  student: "bg-[rgba(30,94,73,0.12)] text-emerald-700",
  parent: "bg-[rgba(108,92,40,0.12)] text-amber-700"
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${roleColors[role]}`}>
      {role}
    </span>
  );
}

