"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Home, Plus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app", icon: Home, label: "Home", match: (p: string) => p === "/app" },
  { href: "/app/history", icon: Clock, label: "History", match: (p: string) => p.startsWith("/app/history") },
  { href: "/app/wallet", icon: Wallet, label: "Wallet", match: (p: string) => p.startsWith("/app/wallet") }
] as const;

export function Dock() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="relative flex w-full max-w-[420px] items-center gap-1 rounded-full border border-border/40 bg-card/80 p-1.5 shadow-2xl shadow-primary/5 backdrop-blur-lg">
        {TABS.slice(0, 1).map((tab) => (
          <DockTab key={tab.href} tab={tab} active={tab.match(pathname)} />
        ))}

        <Link
          href="/app/scan"
          aria-label="New split"
          className="group relative mx-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:translate-y-px"
        >
          <Plus size={20} strokeWidth={2.5} />
        </Link>

        {TABS.slice(1).map((tab) => (
          <DockTab key={tab.href} tab={tab} active={tab.match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

function DockTab({
  tab,
  active
}: {
  tab: { href: string; icon: typeof Home; label: string };
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 flex-1 items-center justify-center rounded-full transition",
        active
          ? "bg-background text-foreground shadow-xs"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon size={18} />
    </Link>
  );
}
