"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "./header";
import { DashboardBottomNav } from "./bottom-nav";

function getTitle(pathname: string): string {
  if (pathname === "/dashboard") return "";
  if (pathname === "/dashboard/new") return "New split";
  if (pathname.startsWith("/dashboard/session/")) return "Session";
  if (pathname === "/dashboard/history") return "History";
  if (pathname === "/dashboard/profile") return "Profile";
  return "Dashboard";
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-dvh overflow-hidden bg-surface-muted text-foreground">
      <div className="relative mx-auto flex h-full w-full max-w-[440px] flex-col overflow-hidden border-x border-border/60 bg-background">
        <DashboardHeader title={getTitle(pathname)} />
        <main
          id="dashboard-main"
          className="dashboard-scrollbar flex-1 overflow-y-auto px-5 pb-28 pt-5"
        >
          {children}
        </main>
        <DashboardBottomNav />
      </div>
    </div>
  );
}
