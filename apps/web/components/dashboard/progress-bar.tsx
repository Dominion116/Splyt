import { cn } from "@/lib/utils";

export function ProgressBar({ value, label, className }: { value: number; label?: string; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${safeValue}%` }} />
      </div>
      {label ? <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">{label}</p> : null}
    </div>
  );
}
