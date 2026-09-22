"use client";

import { useState } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import { signOut, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const { data: session } = useSession();

  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  const name = session?.user?.name ?? session?.user?.email ?? "User";

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent"
        aria-expanded={open}
      >
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {initials}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border bg-card p-2 shadow-lg">
          <div className="border-b px-3 py-3">
            <p className="truncate text-sm font-medium">{name}</p>

            {session?.user?.email && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {session.user.email}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}

            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
