import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getServerSession } from "@/lib/auth-server";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
