"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    setDate: (date?: Date) => void
    placeholder?: string
    className?: string
    label?: string
    minDate?: Date
}

export function DatePicker({ date, setDate, placeholder = "Pick a date", className, label, minDate }: DatePickerProps) {
    return (
        <div className={cn("relative group", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-full h-[52px] pl-11 pr-4 rounded-xl border border-gray-300 bg-white hover:bg-white text-left font-normal text-[15px] transition-all",
                            !date && "text-gray-400"
                        )}
                    >
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
                        {date ? format(date, "PPP") : <span>{placeholder}</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl border-gray-300" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        disabled={minDate ? { before: minDate } : undefined}
                    />
                </PopoverContent>
            </Popover>
            {label && (
                <span className="absolute -top-2 left-4 bg-[#FBFCFD] px-1 text-[10px] text-gray-400 group-focus-within:text-black transition-colors">
                    {label}
                </span>
            )}
        </div>
    )
}
