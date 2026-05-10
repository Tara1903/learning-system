import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

interface StatCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: ReactNode;
}

export function StatCard({ label, value, description, icon }: StatCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="app-shell-card rounded-[1.75rem] p-5"
      whileHover={reduceMotion ? undefined : { y: -6, boxShadow: "0 26px 48px rgba(15,61,46,0.14)" }}
      transition={{ type: "spring", stiffness: 340, damping: 24 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted">{label}</p>
          <p className="mt-4 text-3xl font-semibold text-[var(--text)]">{value}</p>
          <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
        </div>
        <div className="rounded-2xl bg-[rgba(212,175,55,0.16)] p-3 text-[var(--accent)]">{icon}</div>
      </div>
    </motion.div>
  );
}

