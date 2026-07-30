import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-[76px] w-full rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm leading-5 text-text-primary transition-colors outline-none placeholder:text-text-muted focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:text-text-secondary aria-invalid:border-error aria-invalid:ring-1 aria-invalid:ring-error",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
