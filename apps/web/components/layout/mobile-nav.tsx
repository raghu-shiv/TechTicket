"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, X } from "lucide-react";

import { NAVIGATION_ITEMS } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

export function MobileNav() {
  const pathname = usePathname();
  const isOpen = useUIStore((state) => state.isMobileSidebarOpen);
  const close = useUIStore((state) => state.closeMobileSidebar);

  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !dialog.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, close]);

  return (
    <div
      className={cn("fixed inset-0 z-50 lg:hidden", !isOpen && "hidden")}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close navigation overlay"
        className="absolute inset-0 bg-black/40"
        onClick={close}
      />

      <aside
        ref={dialogRef}
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="relative flex h-full w-72 max-w-[85vw] flex-col border-r bg-card shadow-xl"
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <Link
            href="/dashboard"
            onClick={close}
            className="flex items-center gap-3 font-semibold"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ClipboardList className="size-4" aria-hidden="true" />
            </div>
            <span>SupportDesk</span>
          </Link>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            className="rounded-lg p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close navigation"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Primary navigation"
          className="flex-1 space-y-1 overflow-y-auto p-4"
        >
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "hover:bg-accent",
                  isActive && "bg-primary/10 text-primary",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
