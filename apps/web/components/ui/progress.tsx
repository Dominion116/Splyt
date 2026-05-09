import { cn } from "@/lib/utils";

/*
 * Progress: accessible determinate progress bar.
 * Pass `indeterminate` for an animated loading state when % is unknown.
 */
export interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  label?: string;
  tone?: "primary" | "accent" | "success" | "warning" | "danger";
  indeterminate?: boolean;
}

const toneClass: Record<NonNullable<ProgressProps["tone"]>, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger"
};

export function Progress({
  value = 0,
  max = 100,
  className,
  label,
  tone = "primary",
  indeterminate
}: ProgressProps) {
  const pct = indeterminate ? undefined : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : value}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          toneClass[tone],
          indeterminate && "w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite]"
        )}
        style={indeterminate ? undefined : { width: `${pct}%` }}
      />
    </div>
  );
}
