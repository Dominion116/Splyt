"use client";

import { Clock3, History, Home, PlusSquare, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/new", label: "New", icon: PlusSquare },
  { href: "/dashboard/session/demo", label: "Session", icon: Clock3 },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound }
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
    <nav
      aria-label="Primary"
      className="absolute inset-x-0 bottom-0 z-40 h-[72px] border-t border-border bg-background/95 backdrop-blur"
    >
      <ul className="grid h-full grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(pathname, tab.href);

          return (
            <li key={tab.label} className="contents">
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                onClick={() => router.push(tab.href)}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium tracking-wide transition-colors",
                  "focus-visible:outline-none focus-visible:bg-surface-muted",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-6 top-0 h-[2px] rounded-full bg-primary"
                  />
                ) : null}
                <span
                  className={cn(
                    "grid place-items-center rounded-full p-1.5 transition-colors",
                    active ? "bg-primary-soft" : "group-hover:bg-surface-muted"
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                </span>
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
