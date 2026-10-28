import * as React from "react";

import { cn } from "@/lib/utils";

const variants = {
  default:
    "border border-brand-border/40 bg-brand-soft text-brand-soft-foreground",
  primary: "border border-primary/20 bg-primary text-primary-foreground",
  secondary: "border border-border/70 bg-secondary text-secondary-foreground",
  success: "border border-success-border/70 bg-success-bg text-success",
  warning: "border border-warning-border/70 bg-warning-bg text-warning",
  danger: "border border-danger-border/70 bg-danger-bg text-danger",
  info: "border border-info-border/70 bg-info-bg text-info",
  neutral: "border border-neutral-border/70 bg-neutral-bg text-neutral",
  outline: "border border-border bg-card text-foreground",
};

export type BadgeVariant = keyof typeof variants;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1",
        "text-xs font-semibold leading-none",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
