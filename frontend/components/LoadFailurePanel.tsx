interface LoadFailurePanelProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function LoadFailurePanel({
  title = "Unable to load this view",
  message,
  retryLabel = "Try again",
  onRetry
}: LoadFailurePanelProps) {
  return (
    <div className="app-shell-card rounded-[1.8rem] p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-muted">Adhyayan status</p>
      <h2 className="heading-serif mt-4 text-2xl">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-muted">{message}</p>
      {onRetry ? (
        <button
          className="mt-6 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
          onClick={onRetry}
          type="button"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
