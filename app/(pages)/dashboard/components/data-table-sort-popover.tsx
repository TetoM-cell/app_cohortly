"use client"

import * as React from "react"
import { Table } from "@tanstack/react-table"
import { ArrowUpDown, Check, ChevronDown, GripVertical, Plus, Trash2, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Criterion } from "./columns"

interface DataTableSortPopoverProps<TData> {
    table: Table<TData>
    program: {
        rubric: Criterion[]
        [key: string]: any
    }
}

export function DataTableSortPopover<TData>({
    table,
    program,
}: DataTableSortPopoverProps<TData>) {
    const [open, setOpen] = React.useState(false)
    const [isAdding, setIsAdding] = React.useState(false)
    const sorting = table.getState().sorting

    // Reset adding state when popover closes
    React.useEffect(() => {
        if (!open) {
            setIsAdding(false)
        }
    }, [open])

    // If there are no sorts, we should be in adding mode implicitly for the UI
    const showAddView = sorting.length === 0 || isAdding

    const columns = React.useMemo(() => {
        const cols = [
            { id: "applicantName", title: "Applicant" },
            { id: "companyName", title: "Company" },
            { id: "overallScore", title: "AI Score" },
            { id: "status", title: "Status" },
            { id: "submittedDate", title: "Submitted" },
            ...program.rubric.map(c => ({ id: `score_${c.id}`, title: c.name }))
        ]
        return cols
    }, [program.rubric])

    const getColumnTitle = (id: string) => {
        return columns.find(c => c.id === id)?.title || id
    }

    const availableColumns = columns.filter(
        col => !sorting.some(s => s.id === col.id)
    )

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-1 p-0.5 rounded-md hover:bg-blue-50/50 cursor-pointer group transition-colors">
                    <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded text-[13px] font-medium whitespace-nowrap",
                        sorting.length > 0 ? "text-blue-600" : "text-gray-500 group-hover:text-blue-600"
                    )}>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        {sorting.length > 0 ? `${sorting.length} sort${sorting.length > 1 ? 's' : ''}` : "Sort"}
                        <ChevronDown className={cn(
                            "w-3.5 h-3.5 group-hover:text-blue-500",
                            sorting.length > 0 ? "text-blue-400" : "text-gray-300"
                        )} />
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent align="start" className={cn("p-0 shadow-xl rounded-xl border-gray-200/50", showAddView ? "w-52" : "w-auto")} sideOffset={8} collisionPadding={16}>
                {showAddView ? (
                    <Command>
                        <CommandInput placeholder="Sort by..." className="h-7 text-xs" />
                        <CommandList>
                            <CommandEmpty className="py-2 text-xs text-center">No column found.</CommandEmpty>
                            <CommandGroup className="p-1">
                                {availableColumns.map((col) => (
                                    <CommandItem
                                        key={col.id}
                                        value={col.title}
                                        onSelect={() => {
                                            // Add new sort (default asc)
                                            table.setSorting(old => [...old, { id: col.id, desc: false }])
                                            setIsAdding(false)
                                            if (sorting.length === 0) {
                                                // Keep open if it was the first one, let user see it added
                                            } else {
                                                // If adding to existing, also keep open
                                            }
                                        }}
                                        className="text-xs !py-1 !px-2 cursor-pointer"
                                    >
                                        {col.title}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                ) : (
                    <div className="flex flex-col">
                        <div className="p-2 space-y-2">
                            {sorting.map((sort, index) => (
                                <div key={sort.id} className="flex items-center gap-2 group">
                                    <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-move" />

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs font-normal justify-between min-w-[120px] max-w-[160px] px-2 bg-white"
                                            >
                                                <span className="truncate">{getColumnTitle(sort.id)}</span>
                                                <ChevronDown className="w-3 h-3 text-gray-400 ml-2 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-[160px] rounded-lg p-0" collisionPadding={16}>
                                            <Command>
                                                <CommandInput placeholder="Change column..." className="h-7 text-xs" />
                                                <CommandList>
                                                    <CommandEmpty className="py-2 text-xs text-center">No column found.</CommandEmpty>
                                                    <CommandGroup className="p-1">
                                                        {/* Show current column + available ones */}
                                                        {[...availableColumns, columns.find(c => c.id === sort.id)].filter(Boolean).map((col) => (
                                                            <CommandItem
                                                                key={col!.id}
                                                                value={col!.title}
                                                                onSelect={() => {
                                                                    // Replace sort at this index
                                                                    const newSorting = [...sorting]
                                                                    newSorting[index] = { ...sort, id: col!.id }
                                                                    table.setSorting(newSorting)
                                                                }}
                                                                className="text-xs !py-1 !px-2 cursor-pointer"
                                                            >
                                                                <Check className={cn(
                                                                    "mr-1.5 h-3 w-3 shrink-0",
                                                                    sort.id === col!.id ? "opacity-100" : "opacity-0"
                                                                )} />
                                                                {col!.title}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs font-normal justify-between min-w-[100px] px-2 bg-white"
                                            >
                                                {sort.desc ? "Descending" : "Ascending"}
                                                <ChevronDown className="w-3 h-3 text-gray-400 ml-2" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="rounded-lg p-1 min-w-[110px]" collisionPadding={16}>
                                            <DropdownMenuItem
                                                className="text-xs py-1 px-2 cursor-pointer"
                                                onClick={() => {
                                                    const newSorting = [...sorting]
                                                    newSorting[index] = { ...sort, desc: false }
                                                    table.setSorting(newSorting)
                                                }}
                                            >
                                                Ascending
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-xs py-1 px-2 cursor-pointer"
                                                onClick={() => {
                                                    const newSorting = [...sorting]
                                                    newSorting[index] = { ...sort, desc: true }
                                                    table.setSorting(newSorting)
                                                }}
                                            >
                                                Descending
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-gray-400 hover:text-gray-900"
                                        onClick={() => {
                                            const newSorting = sorting.filter((_, i) => i !== index)
                                            table.setSorting(newSorting)
                                        }}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="p-1 border-t border-gray-100 space-y-0.5">
                            {availableColumns.length > 0 && (
                                <div
                                    className="flex items-center w-full justify-start h-8 px-2 text-xs text-gray-500 font-normal hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors rounded-sm"
                                    onClick={() => setIsAdding(true)}
                                >
                                    <Plus className="w-3.5 h-3.5 mr-2" />
                                    Add sort
                                </div>
                            )}
                            <div
                                className="flex items-center w-full justify-start h-8 px-2 text-xs text-gray-500 font-normal hover:bg-gray-100 hover:text-red-600 cursor-pointer transition-colors rounded-sm"
                                onClick={() => table.resetSorting()}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Delete sort
                            </div>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
