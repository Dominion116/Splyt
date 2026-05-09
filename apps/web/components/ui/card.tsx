import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Card — atomic surface primitive.
 * Variants: default | muted | outline | ghost
 * Padding: none | sm | md | lg
 * Interactive cards opt-in via `interactive` for hover/focus affordances.
 */
const cardVariants = cva(
  "rounded-lg border bg-surface text-foreground transition-shadow",
  {
    variants: {
      variant: {
        default: "border-border shadow-xs",
        muted: "border-transparent bg-surface-muted",
        outline: "border-border bg-transparent",
        ghost: "border-transparent bg-transparent shadow-none"
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8"
      },
      interactive: {
        true: "cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:shadow-ring"
      }
    },
    defaultVariants: { variant: "default", padding: "md" }
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  as?: React.ElementType;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, as: Tag = "div", ...props }, ref) => {
    const Component = Tag as React.ElementType;
    return (
      <Component
        ref={ref}
        tabIndex={interactive ? 0 : undefined}
        className={cn(cardVariants({ variant, padding, interactive, className }))}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex items-center gap-3", className)} {...props} />;
}
