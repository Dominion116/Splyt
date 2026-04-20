import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DashboardBadgeVariant = "paid" | "pending" | "settled" | "expired";

const variantClasses: Record<DashboardBadgeVariant, string> = {
  paid: "border-green-500/30 bg-green-500/10 text-green-500",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  settled: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  expired: "border-zinc-700 bg-zinc-900 text-zinc-500"
};

export function DashboardBadge({
  variant,
  className,
  children
}: {
  variant: DashboardBadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return <Badge className={cn("rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest", variantClasses[variant], className)}>{children}</Badge>;
}
