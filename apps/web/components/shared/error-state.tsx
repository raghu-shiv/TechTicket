"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this information. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">{title}</h3>

      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>

      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
