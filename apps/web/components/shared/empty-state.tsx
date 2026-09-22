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
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">{title}</h3>

      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>

      {action && (
        <Button className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
