"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggle } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none",
        className
      )}
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-transform duration-200",
          isDark ? "rotate-90 scale-0" : "rotate-0 scale-100"
        )}
        aria-hidden="true"
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-transform duration-200",
          isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0"
        )}
        aria-hidden="true"
      />
    </button>
  );
}
