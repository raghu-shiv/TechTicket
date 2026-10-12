import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  FileCheck2,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Ticket,
  Users,
  Package,
} from "lucide-react";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** One route list keeps desktop and mobile navigation consistent. */
export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Tickets", href: "/tickets", icon: Ticket },
  { label: "Approvals", href: "/approvals", icon: FileCheck2 },
  { label: "Ticket Library", href: "/ticket-library", icon: FolderOpen },
  { label: "Products", href: "/products", icon: Package },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Users", href: "/users", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;
