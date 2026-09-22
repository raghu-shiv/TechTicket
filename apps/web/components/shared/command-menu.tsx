"use client";

import { Search, X } from "lucide-react";

import { useUIStore } from "@/stores/ui-store";

export function CommandMenu() {
  const isOpen = useUIStore((state) => state.isCommandMenuOpen);

  const close = useUIStore((state) => state.closeCommandMenu);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[15vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close search"
        onClick={close}
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border bg-card shadow-2xl">
        <div className="flex items-center border-b px-4">
          <Search className="size-5 text-muted-foreground" />

          <input
            autoFocus
            placeholder="Search tickets, users, cases..."
            className="h-14 flex-1 bg-transparent px-3 text-sm outline-none"
          />

          <button
            type="button"
            onClick={close}
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Close search"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-8 text-center text-sm text-muted-foreground">
          Search will be connected to the API later.
        </div>
      </div>
    </div>
  );
}
