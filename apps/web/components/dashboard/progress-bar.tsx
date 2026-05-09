import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function ProgressBar({
  value,
  label,
  className
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Progress value={value} label={label} className="h-1.5" />
      {label ? (
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      ) : null}
    </div>
  );
}
