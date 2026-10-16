interface LoadingStateProps {
  label?: string;
  variant?: "page" | "compact";
}

export function LoadingState({
  label = "Loading...",
  variant = "page",
}: LoadingStateProps) {
  const compact = variant === "compact";

  return (
    <div
      className={
        compact
          ? "flex items-center gap-2 py-2 text-sm text-muted-foreground"
          : "flex min-h-72 flex-col items-center justify-center gap-3"
      }
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={[
          "animate-spin rounded-full border-2 border-muted border-t-primary",
          compact ? "size-4" : "size-6",
        ].join(" ")}
      />

      <span>{label}</span>
    </div>
  );
}
