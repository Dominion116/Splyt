"use client";

import { Clock3, History, Home, PlusSquare, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "home", icon: Home },
  { href: "/dashboard/new", label: "new", icon: PlusSquare },
  { href: "/dashboard/session/demo", label: "session", icon: Clock3 },
  { href: "/dashboard/history", label: "history", icon: History },
  { href: "/dashboard/profile", label: "profile", icon: UserRound }
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/session/demo") return pathname.startsWith("/dashboard/session/");
  return pathname === href;
}

export function DashboardBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="absolute inset-x-0 bottom-0 z-50 h-14 border-t border-zinc-800 bg-zinc-950">
      <div className="grid h-full grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(pathname, tab.href);

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => router.push(tab.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 border-t-2 border-transparent text-[10px] uppercase tracking-widest transition-colors",
                active ? "text-indigo-400" : "text-zinc-600"
              )}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
