"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  autoResize?: boolean
}

function Textarea({
  className,
  autoResize = true,
  onInput,
  value,
  defaultValue,
  rows = 4,
  ...props
}: TextareaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const adjustHeight = React.useCallback(() => {
    if (!autoResize) return
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }
  }, [autoResize])

  React.useEffect(() => {
    adjustHeight()
  }, [value, defaultValue, adjustHeight])

  return (
    <textarea
      ref={textareaRef}
      data-slot="textarea"
      rows={rows}
      onInput={(e) => {
        adjustHeight()
        onInput?.(e)
      }}
      className={cn(
        "border-gray-300 placeholder:text-muted-foreground flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs resize-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      value={value}
      defaultValue={defaultValue}
      {...props}
    />
  )
}

export { Textarea }
