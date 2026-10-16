import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

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
      className={
        compact
          ? "flex items-start gap-3 rounded-lg border border-dashed p-3 text-left"
          : "flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center"
      }
    >
      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-full bg-muted",
          compact ? "size-8" : "size-12",
        ].join(" ")}
      >
        <Icon
          className={
            compact
              ? "size-4 text-muted-foreground"
              : "size-5 text-muted-foreground"
          }
          aria-hidden="true"
        />
      </div>

      <div className={compact ? "min-w-0 flex-1" : ""}>
        <h3 className="text-sm font-semibold">{title}</h3>

        <p
          className={
            compact
              ? "mt-1 text-sm text-muted-foreground"
              : "mt-1 max-w-sm text-sm text-muted-foreground"
          }
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
