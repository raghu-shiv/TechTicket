"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  ChevronLeft,
  ClipboardList,
  FileCheck2,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Ticket,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Tickets",
    href: "/tickets",
    icon: Ticket,
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    label: "Approvals",
    href: "/approvals",
    icon: FileCheck2,
  },
  {
    label: "Case Library",
    href: "/case-library",
    icon: FolderOpen,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 font-semibold tracking-tight"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ClipboardList className="size-4" />
          </div>

          <span>SupportDesk</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>

        {navigation.map((item) => {
          const Icon = item.icon;

          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary/10 text-primary hover:bg-primary/10",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <button
          type="button"
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
    </aside>
  );
}
