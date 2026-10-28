import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "block min-h-28 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-sm leading-6 text-foreground shadow-sm",
        "placeholder:text-muted-foreground/80",
        "transition-[border-color,background-color,box-shadow] duration-150 ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/15",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
