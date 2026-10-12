"use client";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 bg-black/40"
        onClick={close}
      />
      <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r bg-card shadow-xl">
        <div className="flex h-16 items-center justify-between border-b px-5">
          <Link
            href="/dashboard"
            onClick={close}
            className="flex items-center gap-3 font-semibold"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ClipboardList className="size-4" />
            </div>
            <span>SupportDesk</span>
          </Link>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 hover:bg-accent"
            aria-label="Close navigation"
          >
            <X className="size-5" />
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  "hover:bg-accent",
                  isActive && "bg-primary/10 text-primary",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
