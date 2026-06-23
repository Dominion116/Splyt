"use client";

import { usePathname, useRouter } from "next/navigation";
import { Clock, Home, Plus, Wallet } from "lucide-react";
import { Dock as DockUI } from "@/components/ui/dock-two";

const NAV_ITEMS = [
  {
    icon: Home,
    label: "Home",
    href: "/app",
    match: (p: string) => p === "/app",
  },
  {
    icon: Clock,
    label: "History",
    href: "/app/history",
    match: (p: string) => p.startsWith("/app/history"),
  },
] as const;

export function Dock() {
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    ...NAV_ITEMS.slice(0, 1).map((t) => ({
      icon: t.icon,
      label: t.label,
      active: t.match(pathname),
      onClick: () => router.push(t.href),
    })),
    {
      icon: Plus,
      label: "New Split",
      active: pathname === "/app/scan",
      onClick: () => router.push("/app/scan"),
      iconClassName: "w-5 h-5",
      className: "bg-primary rounded-full text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30",
    },
    ...NAV_ITEMS.slice(1).map((t) => ({
      icon: t.icon,
      label: t.label,
      active: t.match(pathname),
      onClick: () => router.push(t.href),
    })),
    {
      icon: Wallet,
      label: "Wallet",
      active: pathname.startsWith("/app/wallet"),
      onClick: () => router.push("/app/wallet"),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <DockUI
        items={items}
        className="w-full max-w-[420px] flex justify-center"
      />
    </nav>
  );
}
