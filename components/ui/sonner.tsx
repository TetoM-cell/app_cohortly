"use client"

import {
  Check,
  Info,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "dark" } = useTheme()

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      closeButton
      position="bottom-right"
      icons={{
        success: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </div>
        ),
        info: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
            <Info className="h-4 w-4" strokeWidth={2.5} />
          </div>
        ),
        warning: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-4 w-4" strokeWidth={2.5} />
          </div>
        ),
        error: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </div>
        ),
        loading: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          </div>
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "group relative flex w-full items-start overflow-hidden rounded-xl border border-white/5 bg-[#121212] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all font-sans",
          title: "text-[14px] font-medium text-white mb-1.5 leading-none tracking-normal",
          description: "text-[13px] text-[#A1A1AA] font-sans m-0 p-0 leading-relaxed font-normal",
          content: "flex-1 flex flex-col justify-center",
          icon: "mr-4 self-start mt-0 flex shrink-0 items-center justify-center",
          closeButton: "absolute right-2 top-2 rounded-md p-1.5 text-gray-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100 left-auto cursor-pointer flex shrink-0 w-auto h-auto bg-transparent border-0",
          success: "bg-gradient-to-r from-emerald-500/10 via-[#121212] to-[#121212] border-l-[1px] border-l-emerald-500/20",
          error: "bg-gradient-to-r from-orange-500/10 via-[#121212] to-[#121212] border-l-[1px] border-l-orange-500/20",
          warning: "bg-gradient-to-r from-amber-500/10 via-[#121212] to-[#121212] border-l-[1px] border-l-amber-500/20",
          info: "bg-gradient-to-r from-blue-500/10 via-[#121212] to-[#121212] border-l-[1px] border-l-blue-500/20",
          default: "bg-[#121212]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
