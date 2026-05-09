import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Button
 * - Variants: primary | secondary | outline | ghost | accent | destructive | link
 * - Sizes:    sm | md | lg | icon
 * - States:   default, hover, active, focus-visible, disabled, loading
 *
 * Loading state preserves width via aria-busy and an inline spinner that
 * replaces children, so layout doesn't shift.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "font-medium tracking-tight",
    "rounded-full",
    "transition-[transform,background-color,box-shadow,color] duration-150 ease-out",
    "active:translate-y-[1px]",
    "focus-visible:outline-none focus-visible:shadow-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-[busy=true]:cursor-progress"
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        secondary:
          "bg-foreground text-background hover:bg-foreground/90",
        outline:
          "border border-border bg-surface text-foreground hover:bg-surface-muted",
        ghost:
          "text-foreground hover:bg-surface-muted",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90",
        destructive:
          "bg-danger text-white hover:bg-danger/90",
        link:
          "text-primary underline-offset-4 hover:underline px-0 h-auto rounded-none"
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10"
      },
      block: {
        true: "w-full"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Spinner = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-4 w-4 animate-spin"
    fill="none"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, loading, disabled, leftIcon, rightIcon, children, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        aria-busy={loading || undefined}
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, size, block, className }))}
        {...props}
      >
        {loading ? (
          <>
            <Spinner />
            <span className="sr-only">Loading</span>
            <span aria-hidden="true" className="opacity-70">{children}</span>
          </>
        ) : (
          <>
            {leftIcon ? <span aria-hidden="true" className="-ml-0.5 inline-flex">{leftIcon}</span> : null}
            {children}
            {rightIcon ? <span aria-hidden="true" className="-mr-0.5 inline-flex">{rightIcon}</span> : null}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
