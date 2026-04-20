"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "./header";
import { DashboardBottomNav } from "./bottom-nav";

function getTitle(pathname: string): string {
  if (pathname === "/dashboard") return "home";
  if (pathname === "/dashboard/new") return "new split";
  if (pathname.startsWith("/dashboard/session/")) return "session";
  if (pathname === "/dashboard/history") return "history";
  if (pathname === "/dashboard/profile") return "profile";
  return "dashboard";
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="relative mx-auto flex h-full w-full max-w-93.75 flex-col overflow-hidden bg-zinc-950">
        <DashboardHeader title={getTitle(pathname)} />
        <main className="dashboard-scrollbar flex-1 overflow-y-auto px-4 pb-24 pt-4">{children}</main>
        <DashboardBottomNav />
      </div>
    </div>
  );
}
