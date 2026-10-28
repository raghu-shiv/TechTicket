"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { NAVIGATION_ITEMS } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground shadow-[3px_0_18px_rgba(15,23,42,0.025)] lg:flex">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Link
          href="/dashboard"
          aria-label="TechTicket home"
          className="group flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 transition-transform duration-200 group-hover:scale-[1.03]">
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
      </div>

      {/* Navigation */}
      <nav
        aria-label="Primary navigation"
        className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-5 pt-6"
      >
        {NAVIGATION_GROUPS.map((group) => {
          const items = NAVIGATION_ITEMS.filter((item) =>
            group.hrefs.includes(item.href),
          );

          if (items.length === 0) {
            return null;
          }

          const groupId = `desktop-nav-${group.label
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
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex h-10 items-center gap-3 rounded-xl border border-transparent px-3 text-[13px] font-medium",
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
                          "size-[17px] shrink-0 transition-colors duration-150",
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
  );
}
