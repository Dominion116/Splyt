import * as React from "react"
import { cn } from "@/lib/utils"

function Badge({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span data-slot="badge" className={cn("inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-sm", className)} {...props}>
      {children}
    </span>
  )
}

export { Badge }
