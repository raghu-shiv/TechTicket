import { cn } from "@/lib/utils";

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
      className={cn(
        compact
          ? "flex items-center gap-2.5 py-2 text-sm text-muted-foreground"
          : "flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-card/50 px-6 py-10 text-center",
      )}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block shrink-0 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none",
          compact ? "size-4" : "size-7",
        )}
      />

      <span
        className={cn(
          "text-muted-foreground",
          compact ? "text-sm" : "text-sm font-medium",
        )}
      >
        {label}
      </span>
    </div>
  );
}
