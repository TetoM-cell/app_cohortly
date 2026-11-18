import * as React from "react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("ml-auto shrink-0 flex items-center gap-2", className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
