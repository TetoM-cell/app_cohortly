import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success-light" | string
  size?: "default" | "sm" | "lg"
}

export function Badge({ className, variant = "default", size = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        size === "sm" && "px-2 py-0.25 text-[11px]",
        variant === "default" && "border-transparent bg-primary text-primary-foreground",
        variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground",
        variant === "destructive" && "border-transparent bg-destructive/10 text-destructive border-destructive/20",
        variant === "success-light" && "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        variant === "outline" && "text-foreground",
        className
      )}
      {...props}
    />
  )
}
