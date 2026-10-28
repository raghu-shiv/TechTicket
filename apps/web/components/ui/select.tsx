import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, disabled, ...props }, ref) {
  return (
    <div className={cn("relative w-full", disabled && "opacity-80")}>
      <select
        ref={ref}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full appearance-none rounded-xl border border-input bg-card px-3.5 pr-10 text-sm text-foreground shadow-sm",
          "transition-[border-color,background-color,box-shadow] duration-150 ease-standard",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/15",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </select>

      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
});

Select.displayName = "Select";
