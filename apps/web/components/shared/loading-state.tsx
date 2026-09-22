interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div
      className="flex min-h-72 flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />

      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
