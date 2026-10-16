"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

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
      className={
        compact
          ? "flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-left"
          : "flex min-h-72 flex-col items-center justify-center px-6 text-center"
      }
    >
      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive",
          compact ? "size-8" : "size-12",
        ].join(" ")}
      >
        <AlertTriangle
          className={compact ? "size-4" : "size-5"}
          aria-hidden="true"
        />
      </div>

      <div className={compact ? "min-w-0 flex-1" : ""}>
        <h3 className="text-sm font-semibold">{title}</h3>

        <p
          className={
            compact
              ? "mt-1 break-words text-sm text-muted-foreground"
              : "mt-1 max-w-sm text-sm text-muted-foreground"
          }
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
