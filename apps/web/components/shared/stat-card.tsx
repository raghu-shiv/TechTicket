import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive?: boolean;
  };
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: StatCardProps) {
  return (
    <Card className="h-full overflow-hidden border-border/80 shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex h-full items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase leading-5 tracking-wide text-muted-foreground">
              {title}
            </p>

            <p className="mt-3 font-display text-3xl font-semibold leading-none tracking-tight text-card-foreground tabular-nums sm:text-4xl">
              {value}
            </p>

            {description && (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            )}

            {trend && (
              <p
                className={cn(
                  "mt-3 text-xs font-semibold leading-5",
                  trend.positive ? "text-success" : "text-danger",
                )}
              >
                {trend.value}
              </p>
            )}
          </div>

          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-brand-soft text-brand-soft-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
