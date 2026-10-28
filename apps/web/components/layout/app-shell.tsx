"use client";

import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandMenu } from "@/components/shared/command-menu";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar />

      <MobileNav />

      <CommandMenu />

      <div className="min-w-0 lg:pl-64">
        <Topbar />

        <main className="min-h-[calc(100dvh-4rem)] px-4 py-6 sm:px-6 sm:py-8 xl:px-8 2xl:px-10">
          <div className="mx-auto w-full max-w-[1680px] min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
