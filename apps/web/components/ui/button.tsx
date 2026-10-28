import * as React from "react";

import { cn } from "@/lib/utils";

const variants = {
  default:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-hover",
  secondary:
    "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-border bg-card text-foreground shadow-sm hover:border-primary/30 hover:bg-surface-muted",
  ghost: "border border-transparent text-foreground hover:bg-surface-muted",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:brightness-95 active:brightness-90",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizes = {
  sm: "h-9 rounded-lg px-3 text-xs",
  default: "h-10 rounded-xl px-4 text-sm",
  lg: "h-11 rounded-xl px-5 text-sm",
  icon: "size-10 rounded-xl",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  const sizing = variant === "link" ? "h-auto rounded-none px-0" : sizes[size];

  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "active:disabled:transform-none active:scale-[0.99]",
        variants[variant],
        sizing,
        className,
      )}
      {...props}
    />
  );
}
