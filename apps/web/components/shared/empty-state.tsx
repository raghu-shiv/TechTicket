import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "page" | "compact";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "page",
}: EmptyStateProps) {
  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/80 bg-card/70",
        compact
          ? "flex items-start gap-3 p-4 text-left"
          : "flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center shadow-sm",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface-muted text-muted-foreground",
          compact ? "size-9" : "size-12",
        )}
      >
        <Icon className={compact ? "size-4" : "size-5"} aria-hidden="true" />
      </div>

      <div className={cn("min-w-0", compact ? "flex-1" : "mt-4")}>
        <h3 className="text-sm font-semibold leading-5 text-foreground">
          {title}
        </h3>

        <p
          className={cn(
            "text-sm leading-6 text-muted-foreground",
            compact ? "mt-1" : "mx-auto mt-2 max-w-md",
          )}
        >
          {description}
        </p>

        {action && (
          <Button
            className={compact ? "mt-3" : "mt-5"}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
