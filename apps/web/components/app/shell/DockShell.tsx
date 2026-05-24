"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Dock } from "./Dock";

const DOCK_HIDDEN_PATTERNS = [
  /^\/app\/scan$/,
  /^\/app\/session\/[^/]+/,
  /^\/app\/pay\//,
  /^\/app\/connect/,
  /^\/app\/review\//,
  /^\/app\/members\//,
  /^\/app\/split\//,
];

export function DockShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showDock = !DOCK_HIDDEN_PATTERNS.some((re) => re.test(pathname));

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col">
      <main
        className="flex flex-1 flex-col"
        style={{ paddingBottom: showDock ? "calc(5.5rem + env(safe-area-inset-bottom))" : undefined }}
      >
        {children}
      </main>
      {showDock ? <Dock /> : null}
    </div>
  );
}
