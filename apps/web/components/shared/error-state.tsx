"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  variant?: "page" | "compact";
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this information. Please try again.",
  onRetry,
  variant = "page",
}: ErrorStateProps) {
  const compact = variant === "compact";

  return (
    <div
      role="alert"
      className={cn(
        compact
          ? "flex items-start gap-3 rounded-xl border border-danger-border/70 bg-danger-bg/70 p-4 text-left"
          : "flex min-h-72 flex-col items-center justify-center rounded-2xl border border-danger-border/40 bg-card px-6 py-10 text-center",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl border border-danger-border/60 bg-danger-bg text-danger",
          compact ? "size-9" : "size-12",
        )}
      >
        <AlertTriangle
          className={compact ? "size-4" : "size-5"}
          aria-hidden="true"
        />
      </div>

      <div className={cn("min-w-0", compact ? "flex-1" : "mt-4")}>
        <h3 className="text-sm font-semibold leading-5 text-foreground">
          {title}
        </h3>

        <p
          className={cn(
            "break-words text-sm leading-6 text-muted-foreground",
            compact ? "mt-1" : "mx-auto mt-2 max-w-md",
          )}
        >
          {description}
        </p>

        {onRetry && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            className={compact ? "mt-3" : "mt-5"}
            onClick={onRetry}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
