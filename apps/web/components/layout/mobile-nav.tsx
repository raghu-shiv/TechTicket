"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, X } from "lucide-react";

import { NAVIGATION_ITEMS } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

const NAVIGATION_GROUPS: {
  label: string;
  hrefs: readonly string[];
}[] = [
  {
    label: "Workspace",
    hrefs: ["/dashboard", "/tickets", "/approvals", "/ticket-library"],
  },
  {
    label: "Management",
    hrefs: ["/products", "/users"],
  },
  {
    label: "Insights",
    hrefs: ["/reports"],
  },
  {
    label: "Preferences",
    hrefs: ["/settings"],
  },
];

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

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

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

      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;

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
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close navigation overlay"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={close}
      />

      {/* Drawer */}
      <aside
        ref={dialogRef}
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="relative flex h-dvh w-80 max-w-[88vw] flex-col border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground shadow-2xl shadow-slate-950/20"
      >
        {/* Brand and close control */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <Link
            href="/dashboard"
            onClick={close}
            aria-label="TechTicket home"
            className="group flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-[1.03]">
              <ClipboardList className="size-5" aria-hidden="true" />
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-sidebar-foreground">
                TechTicket
              </span>
              <span className="mt-0.5 block text-[11px] font-medium tracking-wide text-sidebar-muted-foreground">
                Support workspace
              </span>
            </span>
          </Link>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-sidebar-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background"
            aria-label="Close navigation"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation groups */}
        <nav
          aria-label="Primary navigation"
          className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-6"
        >
          {NAVIGATION_GROUPS.map((group) => {
            const items = NAVIGATION_ITEMS.filter((item) =>
              group.hrefs.includes(item.href),
            );

            if (items.length === 0) {
              return null;
            }

            const groupId = `mobile-nav-${group.label
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`;

            return (
              <section
                key={group.label}
                aria-labelledby={groupId}
                className="space-y-2"
              >
                <h2
                  id={groupId}
                  className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-muted-foreground"
                >
                  {group.label}
                </h2>

                <div className="space-y-1">
                  {items.map((item) => {
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
                          "group relative flex h-11 items-center gap-3 rounded-xl border border-transparent px-3 text-[13px] font-medium",
                          "transition-colors duration-150 ease-standard",
                          "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-transparent before:content-['']",
                          "hover:bg-surface-muted hover:text-foreground",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background",
                          isActive &&
                            "border-primary/15 bg-sidebar-active text-sidebar-active-foreground shadow-sm before:bg-primary hover:bg-sidebar-active hover:text-sidebar-active-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0 transition-colors duration-150",
                            isActive
                              ? "text-sidebar-active-foreground"
                              : "text-sidebar-muted-foreground group-hover:text-foreground",
                          )}
                          aria-hidden="true"
                        />

                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>

        {/* Footer branding */}
        <div className="shrink-0 border-t border-sidebar-border px-5 py-4">
          <p className="text-[11px] font-medium text-sidebar-muted-foreground">
            TechTicket
            <span className="mx-1.5 text-border" aria-hidden="true">
              /
            </span>
            <span>Support operations</span>
          </p>
        </div>
      </aside>
    </div>
  );
}
