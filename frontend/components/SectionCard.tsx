import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function SectionCard({ title, eyebrow, action, children }: SectionCardProps) {
  return (
    <section className="app-shell-card rounded-none border-x-0 p-4 md:rounded-[1.75rem] md:border-x md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? <p className="text-xs uppercase tracking-[0.25em] text-muted">{eyebrow}</p> : null}
          <h2 className="heading-serif mt-2 text-2xl text-[var(--text)]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

