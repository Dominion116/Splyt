"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function PrimaryAction() {
  return (
    <Link
      href="/app/scan"
      className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-full bg-primary p-1 ps-6 pe-1 text-primary-foreground transition hover:bg-primary/90"
    >
      <span className="py-2 text-sm font-medium">New split</span>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground transition group-hover:rotate-45">
        <ArrowUpRight size={16} />
      </span>
    </Link>
  );
}
