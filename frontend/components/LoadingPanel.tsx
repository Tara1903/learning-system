export function LoadingPanel({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <div className="app-shell-card rounded-[1.75rem] p-8 text-center">
      <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-[rgba(212,175,55,0.18)]" />
      <p className="mt-4 text-sm text-muted">{label}</p>
    </div>
  );
}

