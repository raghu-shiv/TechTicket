"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <ThemeProvider>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}
