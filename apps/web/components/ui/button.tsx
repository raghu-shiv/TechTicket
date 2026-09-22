import * as React from "react";

import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizes = {
  sm: "h-9 rounded-md px-3 text-xs",
  default: "h-10 rounded-lg px-4 text-sm",
  lg: "h-11 rounded-lg px-6 text-sm",
  icon: "size-10 rounded-lg",
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
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
