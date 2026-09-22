import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProvider } from "@/providers/app-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TechTicket",
    template: "%s | TechTicket",
  },
  description: "Enterprise support ticketing platform",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
