import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type DashboardBadgeVariant = "paid" | "pending" | "settled" | "expired";

const variantToBadge: Record<DashboardBadgeVariant, "success" | "warning" | "primary" | "secondary"> = {
  paid: "success",
  pending: "warning",
  settled: "primary",
  expired: "secondary"
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
  return (
    <Badge variant={variantToBadge[variant]} dot className={className}>
      {children}
    </Badge>
  );
}
