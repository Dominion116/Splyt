import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Input
 * - Variants: default | filled
 * - Sizes:    sm | md | lg
 * - States:   default, hover, focus-visible, invalid (aria-invalid), disabled
 *
 * Wraps an <input>. For label/help text/error layout, prefer <Field> below.
 */
const inputVariants = cva(
  [
    "w-full rounded-md text-foreground placeholder:text-muted-foreground/70",
    "border transition-[border-color,box-shadow,background-color] duration-150",
    "focus-visible:outline-none focus-visible:shadow-ring",
    "disabled:cursor-not-allowed disabled:opacity-60",
    "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:shadow-[0_0_0_4px_rgb(var(--danger)/0.2)]"
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-surface border-border hover:border-foreground/20",
        filled: "bg-surface-muted border-transparent hover:bg-surface"
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-base"
      }
    },
    defaultVariants: { variant: "default", size: "md" }
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, ...props }, ref) => (
    <input ref={ref} className={cn(inputVariants({ variant, size, className }))} {...props} />
  )
);
Input.displayName = "Input";

/* Field: label + input + help/error layout. Use for forms. */
export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean | "true" | "false" }>;
}

export function Field({ id, label, hint, error, required, children }: FieldProps) {
  const helpId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const child = React.cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined
  });
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span aria-hidden="true" className="ml-0.5 text-danger">*</span> : null}
      </label>
      {child}
      {hint && !error ? <p id={helpId} className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p id={errorId} role="alert" className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
