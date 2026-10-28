"use client";

import Link from "next/link";
import { Menu, Search, Settings } from "lucide-react";

import { NotificationBell } from "@/components/shared/notification-bell";
import { UserMenu } from "@/components/shared/user-menu";
import { useUIStore } from "@/stores/ui-store";

export function Topbar() {
  const openMobileSidebar = useUIStore((state) => state.openMobileSidebar);
  const openCommandMenu = useUIStore((state) => state.openCommandMenu);
  const isMobileSidebarOpen = useUIStore((state) => state.isMobileSidebarOpen);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border/80 bg-background/90 shadow-sm shadow-slate-950/[0.025] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-full w-full max-w-[1680px] items-center gap-3 px-4 sm:gap-4 sm:px-6 xl:px-8 2xl:px-10">
        {/* Mobile navigation trigger */}
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
          aria-label="Open navigation"
          aria-expanded={isMobileSidebarOpen}
          aria-controls="mobile-navigation"
          aria-haspopup="dialog"
          onClick={openMobileSidebar}
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        {/* Desktop global search trigger */}
        <button
          type="button"
          onClick={openCommandMenu}
          aria-label="Search tickets and knowledge articles"
          aria-haspopup="dialog"
          aria-controls="global-ticket-search-dialog"
          aria-keyshortcuts="Control+K Meta+K"
          className="group relative hidden h-10 w-full max-w-[34rem] flex-1 items-center text-left focus-visible:outline-none md:flex"
        >
          <span className="absolute left-3.5 flex items-center justify-center text-muted-foreground transition-colors group-hover:text-primary">
            <Search className="size-4" aria-hidden="true" />
          </span>

          <span className="flex h-full w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-border/80 bg-surface/80 pl-10 pr-3 text-sm text-muted-foreground shadow-sm transition-colors duration-150 group-hover:border-primary/30 group-hover:bg-card group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background">
            <span className="truncate">
              Search tickets and knowledge articles...
            </span>

            <kbd className="hidden shrink-0 items-center gap-1 rounded-md border border-border bg-surface-muted px-2 py-1 font-mono text-[10px] font-medium leading-none text-muted-foreground lg:inline-flex">
              <span>Ctrl</span>
              <span className="opacity-60">+</span>
              <span>K</span>
              <span className="mx-0.5 opacity-40">/</span>
              <span>⌘</span>
              <span className="opacity-60">+</span>
              <span>K</span>
            </kbd>
          </span>
        </button>

        {/* Top bar actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Mobile search trigger */}
          <button
            type="button"
            onClick={openCommandMenu}
            className="inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
            aria-label="Search tickets and knowledge articles"
            aria-haspopup="dialog"
            aria-controls="global-ticket-search-dialog"
            aria-keyshortcuts="Control+K Meta+K"
            title="Search tickets and knowledge articles"
          >
            <Search className="size-5" aria-hidden="true" />
          </button>

          {/* Notification entry point */}
          <div className="[&>div>button]:rounded-xl [&>div>button]:text-muted-foreground [&>div>button]:transition-colors [&>div>button:hover]:bg-surface-muted [&>div>button:hover]:text-foreground">
            <NotificationBell />
          </div>

          {/* Account and workspace actions */}
          <div className="flex items-center gap-0.5 rounded-2xl border border-border/80 bg-surface/80 p-1 shadow-sm">
            <Link
              href="/settings"
              className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="size-[18px]" aria-hidden="true" />
            </Link>

            <span
              className="mx-0.5 hidden h-6 w-px bg-border sm:block"
              aria-hidden="true"
            />

            <div className="[&>div>button]:rounded-xl [&>div>button]:transition-colors [&>div>button:hover]:bg-surface-muted">
              <UserMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
