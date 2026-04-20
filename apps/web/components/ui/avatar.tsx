import * as React from "react";
import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-8 w-8 overflow-hidden rounded-md bg-zinc-800", className)} {...props} />;
}
