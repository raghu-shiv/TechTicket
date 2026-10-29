import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex min-w-0 flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        <h1 className="max-w-full break-words font-display text-page-title font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] text-foreground">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
