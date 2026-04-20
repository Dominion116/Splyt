import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => (
  <input
    className={cn(
      "flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 file:border-0 file:bg-transparent file:text-sm",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
