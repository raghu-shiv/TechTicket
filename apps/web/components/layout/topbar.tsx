"use client";

import Link from "next/link";
import { Bell, Menu, Search, Settings } from "lucide-react";

import { UserMenu } from "@/components/shared/user-menu";
import { useUIStore } from "@/stores/ui-store";

export function Topbar() {
  const openMobileSidebar = useUIStore((state) => state.openMobileSidebar);
  const openCommandMenu = useUIStore((state) => state.openCommandMenu);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <div className="flex w-full items-center gap-4">
        <button
          type="button"
          className="rounded-lg p-2 hover:bg-accent lg:hidden"
          aria-label="Open navigation"
          onClick={openMobileSidebar}
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={openCommandMenu}
          aria-label="Search tickets"
          aria-haspopup="dialog"
          aria-controls="global-ticket-search-dialog"
          aria-keyshortcuts="Control+K Meta+K"
          className="relative hidden h-10 max-w-md flex-1 items-center text-left md:flex"
        >
          <Search
            className="absolute left-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />

          <span className="w-full truncate rounded-lg border bg-muted/30 py-2.5 pl-10 pr-28 text-sm text-muted-foreground transition hover:bg-muted/50">
            Search tickets by number, title, or description...
          </span>

          <kbd className="absolute right-3 rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Ctrl K / ⌘ K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={openCommandMenu}
            className="rounded-lg p-2 hover:bg-accent md:hidden"
            aria-label="Search tickets"
            aria-haspopup="dialog"
            aria-controls="global-ticket-search-dialog"
            aria-keyshortcuts="Control+K Meta+K"
            title="Search tickets"
          >
            <Search className="size-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="relative rounded-lg p-2 hover:bg-accent"
            aria-label="Notifications"
            title="Notifications are planned for a later milestone"
          >
            <Bell className="size-5" aria-hidden="true" />
          </button>

          <Link
            href="/settings"
            className="rounded-lg p-2 hover:bg-accent"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="size-5" aria-hidden="true" />
          </Link>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
