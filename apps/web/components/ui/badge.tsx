import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Badge: small status / label primitive.
 * Variants align with semantic intent (neutral / primary / accent / success / warning / danger).
 * Use `variant="outline"` for a low-emphasis chip.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-surface-muted text-foreground",
        outline: "border border-border bg-transparent text-foreground",
        primary: "bg-primary-soft text-primary",
        accent: "bg-accent-soft text-accent",
        secondary: "bg-foreground/5 text-foreground",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        destructive: "bg-danger/10 text-danger"
      }
    },
    defaultVariants: { variant: "default" }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
