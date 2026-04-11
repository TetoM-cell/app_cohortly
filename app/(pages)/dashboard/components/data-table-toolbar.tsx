
"use client"

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Table } from "@tanstack/react-table"
import { Search, Filter, ArrowUpDown, MoreHorizontal, Columns, Plus, X, ChevronDown, ChevronRight, ArrowLeft, Building2, Activity, ListTodo, Calendar as CalendarIcon, ExternalLink, Sparkles, CircleStop, Settings, LayoutDashboard, Pencil, Table2, Kanban, ChevronUp, Download, Upload } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getStatusColor, getStatusDotColor } from "./columns"
import { DualRangeSlider } from "@/components/ui/dual-range-slider"
import { DateRange } from "react-day-picker"
import { parse, isWithinInterval } from "date-fns"

import { Criterion } from "./columns"
import { DataTableSortPopover } from "./data-table-sort-popover"
import { Checkbox } from "@/components/ui/checkbox"

interface LayoutPrefs {
    showVerticalLines: boolean
    openPagesIn: 'side-sheet' | 'center-sheet'
    loadLimit: 10 | 25 | 50 | 100
    layoutView: 'table' | 'kanban'
}

interface DataTableToolbarProps<TData> {
    table: Table<TData>
    program: {
        rubric: Criterion[]
        [key: string]: any
    }
    onRunAIReview?: () => void
    isScoring?: boolean
    onCancelScoring?: () => void
    onSettingsClick?: () => void
    onCohortRename?: (name: string) => void
    onLayoutPrefsChange?: (prefs: LayoutPrefs) => void
    onExport?: () => void
    onImport?: () => void
}

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import React from "react"

export interface DataTableToolbarHandle {
    focusSearch: () => void
    toggleFilter: () => void
    toggleSort: () => void
}

export const DataTableToolbar = forwardRef(function DataTableToolbarInner<TData>(
    { table, program, onRunAIReview, isScoring, onCancelScoring, onSettingsClick, onCohortRename, onLayoutPrefsChange, onExport, onImport }: DataTableToolbarProps<TData>,
    ref: React.Ref<DataTableToolbarHandle>
) {
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [isSortFilterBarOpen, setIsSortFilterBarOpen] = useState(false)
    const [barMode, setBarMode] = useState<'sort' | 'filter'>('sort')
    const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false)
    const [isColumnVisDropdownOpen, setIsColumnVisDropdownOpen] = useState(false)
    const [cohortNameInput, setCohortNameInput] = useState(program?.name || "")
    const inputRef = useRef<HTMLInputElement>(null)

    // Layout sub-panel state
    const [settingsView, setSettingsView] = useState<'main' | 'layout'>('main')
    const [layoutView, setLayoutView] = useState<'table' | 'kanban'>('table')
    const [showVerticalLines, setShowVerticalLines] = useState(true)
    const [openPagesIn, setOpenPagesIn] = useState<'side-sheet' | 'center-sheet'>('side-sheet')
    const [loadLimit, setLoadLimit] = useState<10 | 25 | 50 | 100>(50)
    const [openPagesDropdownOpen, setOpenPagesDropdownOpen] = useState(false)
    const [loadLimitDropdownOpen, setLoadLimitDropdownOpen] = useState(false)

    const notifyLayoutPrefs = (overrides: Partial<LayoutPrefs> = {}) => {
        const prefs: LayoutPrefs = {
            showVerticalLines,
            openPagesIn,
            loadLimit,
            layoutView,
            ...overrides
        }
        onLayoutPrefsChange?.(prefs)
    }

    // Expose imperative handle for hotkey integration
    useImperativeHandle(ref, () => ({
        focusSearch: () => {
            setIsSearchOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
        },
        toggleFilter: () => {
            if (isSortFilterBarOpen && barMode === 'filter') {
                setIsSortFilterBarOpen(false);
            } else {
                setBarMode('filter');
                setIsSortFilterBarOpen(true);
            }
        },
        toggleSort: () => {
            if (isSortFilterBarOpen && barMode === 'sort') {
                setIsSortFilterBarOpen(false);
            } else {
                setBarMode('sort');
                setIsSortFilterBarOpen(true);
            }
        },
    }), [isSortFilterBarOpen, barMode]);

    // Pending filter state (before Apply)
    const [pendingCompanies, setPendingCompanies] = useState<string[]>([])
    const [pendingStatuses, setPendingStatuses] = useState<string[]>([])

    // Dynamic score ranges based on rubric + overall score
    const initialScoreRanges = React.useMemo(() => {
        const ranges: Record<string, number[]> = {
            overall: [0, 100]
        }
        program.rubric.forEach(criterion => {
            ranges[criterion.id] = [0, 100]
        })
        return ranges
    }, [program.rubric])

    const [pendingScoreRanges, setPendingScoreRanges] = useState<Record<string, number[]>>(initialScoreRanges)
    const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>()
    const [tempVisibility, setTempVisibility] = useState<Record<string, boolean>>({})

    const handleConfirmVisibility = () => {
        table.setColumnVisibility(tempVisibility)
    }

    // Sync temp visibility when dropdown opens - set to unchecked (false) by default
    const handleVisibilityOpenChange = (open: boolean) => {
        if (open) {
            const current = table.getAllColumns().reduce((acc, col) => {
                if (typeof col.accessorFn !== "undefined" && col.getCanHide()) {
                    acc[col.id] = false
                } else {
                    acc[col.id] = true // Keep selection/internal columns visible
                }
                return acc
            }, {} as Record<string, boolean>)
            setTempVisibility(current)
        }
    }

    const handleCheckAll = () => {
        const allVisible = table.getAllColumns().reduce((acc, col) => {
            acc[col.id] = true
            return acc
        }, {} as Record<string, boolean>)
        setTempVisibility(allVisible)
    }

    // Get unique companies and statuses from data
    const uniqueCompanies = React.useMemo(() => {
        const companies = new Set<string>()
        table.getRowModel().rows.forEach(row => {
            const company = (row.original as any).companyName
            if (company) companies.add(company)
        })
        return Array.from(companies).sort()
    }, [table])

    const uniqueStatuses = ["New", "Reviewing", "Shortlist", "Interview", "Accepted", "Rejected"]

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isSearchOpen])

    const activeSorts = table.getState().sorting
    const activeFilters = table.getState().columnFilters

    return (
        <div className="flex flex-col border-b border-gray-100" id="datatable-toolbar">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between py-2 px-1">
                {/* Left side: Quick Actions */}
                <div className="flex items-center gap-2">
                    {program.id && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 rounded-md font-medium text-[11px] gap-1.5 transition-colors"
                            onClick={() => window.open(`/apply/${program.id}`, '_blank')}
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Form
                        </Button>
                    )}
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-1">
                    <div
                        className={cn(
                            "relative flex items-center transition-all duration-300 ease-in-out h-7 overflow-hidden",
                            isSearchOpen ? "w-[240px]" : "w-8"
                        )}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-7 w-8 p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full shrink-0 z-10",
                                        isSearchOpen && "pointer-events-none"
                                    )}
                                    onClick={() => setIsSearchOpen(true)}
                                >
                                    <Search className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Search (F)
                            </TooltipContent>
                        </Tooltip>

                        <div className={cn(
                            "absolute right-0 flex items-center h-7 rounded-full transition-all duration-300 ease-in-out",
                            isSearchOpen ? "w-[240px] opacity-100 pl-8 pr-3" : "w-0 opacity-0 pl-0 pr-0"
                        )}>
                            <Input
                                ref={inputRef}
                                placeholder="Search applicants..."
                                value={(table.getColumn("applicantName")?.getFilterValue() as string) ?? ""}
                                onChange={(event) =>
                                    table.getColumn("applicantName")?.setFilterValue(event.target.value)
                                }
                                className="h-6 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-0 px-2 placeholder:text-gray-400"
                                onBlur={() => {
                                    if (!table.getColumn("applicantName")?.getFilterValue()) {
                                        setIsSearchOpen(false)
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-7 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full font-normal gap-1",
                                    (activeFilters.length > 0 || (isSortFilterBarOpen && barMode === 'filter')) && "text-blue-500 bg-blue-50/50 hover:bg-blue-100/50"
                                )}
                                onClick={() => {
                                    if (isSortFilterBarOpen && barMode === 'filter') {
                                        setIsSortFilterBarOpen(false)
                                    } else {
                                        setBarMode('filter')
                                        setIsSortFilterBarOpen(true)
                                    }
                                }}
                            >
                                <Filter className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Filter (Alt+F)
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-7 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full font-normal gap-1",
                                    (activeSorts.length > 0 || (isSortFilterBarOpen && barMode === 'sort')) && "text-blue-500 bg-blue-50/50 hover:bg-blue-100/50"
                                )}
                                onClick={() => {
                                    if (isSortFilterBarOpen && barMode === 'sort') {
                                        setIsSortFilterBarOpen(false)
                                    } else {
                                        setBarMode('sort')
                                        setIsSortFilterBarOpen(true)
                                    }
                                }}
                            >
                                <ArrowUpDown className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Sort (Alt+S)
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenu open={isColumnVisDropdownOpen} onOpenChange={(open) => { setIsColumnVisDropdownOpen(open); handleVisibilityOpenChange(open); }}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 p-2 text-gray-400 hover:bg-gray-100 rounded-full"
                                    >
                                        <Columns className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 p-0 overflow-hidden rounded-xl shadow-lg border-gray-200/50" collisionPadding={16}>
                                    <div className="p-1 pb-0 space-y-0.5">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest my-2 px-2 opacity-80">Display Columns</div>
                                        {table
                                            .getAllColumns()
                                            .filter(
                                                (column) =>
                                                    typeof column.accessorFn !== "undefined" && column.getCanHide()
                                            )
                                            .map((column) => {
                                                const label = (() => {
                                                    if (column.id === 'applicantName') return 'Applicant';
                                                    if (column.id === 'companyName') return 'Company';
                                                    if (column.id === 'overallScore') return 'AI Score';
                                                    if (column.id === 'submittedDate') return 'Submitted';
                                                    if (column.id === 'status') return 'Status';
                                                    if (column.id.startsWith('score_')) {
                                                        const meta = column.columnDef.meta as any;
                                                        return meta?.title || column.id.replace('score_', '');
                                                    }
                                                    return column.id;
                                                })();

                                                return (
                                                    <div
                                                        key={column.id}
                                                        className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-gray-50 rounded-md cursor-pointer transition-all group"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const isChecked = tempVisibility[column.id] ?? column.getIsVisible();
                                                            setTempVisibility(prev => ({
                                                                ...prev,
                                                                [column.id]: !isChecked
                                                            }))
                                                        }}
                                                    >
                                                        <Checkbox
                                                            id={`col-${column.id}`}
                                                            checked={tempVisibility[column.id] ?? column.getIsVisible()}
                                                            onCheckedChange={(checked) => {
                                                                setTempVisibility(prev => ({
                                                                    ...prev,
                                                                    [column.id]: !!checked
                                                                }))
                                                            }}
                                                            className="h-4 w-4 rounded-sm border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all"
                                                        />
                                                        <label
                                                            htmlFor={`col-${column.id}`}
                                                            className="text-xs text-gray-600 group-hover:text-gray-900 cursor-pointer select-none flex-1 truncate font-medium"
                                                        >
                                                            {label}
                                                        </label>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                    <div className="p-1 pt-1.5 flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7.5 flex-1 text-[11px] font-medium border-gray-200 hover:bg-white hover:text-blue-600 hover:border-blue-200 rounded-full transition-colors"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleCheckAll();
                                            }}
                                        >
                                            Check all
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-7.5 flex-1 bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-medium rounded-full shadow-sm transition-colors"
                                            onClick={(e) => {
                                                handleConfirmVisibility();
                                            }}
                                        >
                                            Confirm
                                        </Button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                            Columns
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenu open={isSettingsDropdownOpen} onOpenChange={(open) => {
                                setIsSettingsDropdownOpen(open);
                                if (open) { setCohortNameInput(program?.name || ""); setSettingsView('main'); }
                                if (!open) setSettingsView('main');
                            }}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg flex items-center justify-center transition-colors ml-1"
                                    >
                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600">
                                            <path d="M5.5 3C4.67157 3 4 3.67157 4 4.5C4 5.32843 4.67157 6 5.5 6C6.32843 6 7 5.32843 7 4.5C7 3.67157 6.32843 3 5.5 3ZM3 5C3.01671 5 3.03323 4.99918 3.04952 4.99758C3.28022 6.1399 4.28967 7 5.5 7C6.71033 7 7.71978 6.1399 7.95048 4.99758C7.96677 4.99918 7.98329 5 8 5H13.5C13.7761 5 14 4.77614 14 4.5C14 4.22386 13.7761 4 13.5 4H8C7.98329 4 7.96677 4.00082 7.95048 4.00242C7.71978 2.86009 6.71033 2 5.5 2C4.28967 2 3.28022 2.86009 3.04952 4.00242C3.03323 4.00082 3.01671 4 3 4H1.5C1.22386 4 1 4.22386 1 4.5C1 4.77614 1.22386 5 1.5 5H3ZM11.9505 10.9976C11.7198 12.1399 10.7103 13 9.5 13C8.28967 13 7.28022 12.1399 7.04948 10.9976C7.03323 10.9992 7.01671 11 7 11H1.5C1.22386 11 1 10.7761 1 10.5C1 10.2239 1.22386 10 1.5 10H7C7.01671 10 7.03323 10.0008 7.04948 10.0024C7.28022 8.8601 8.28967 8 9.5 8C10.7103 8 11.7198 8.8601 11.9505 10.0024C11.9668 10.0008 11.9833 10 12 10H13.5C13.7761 10 14 10.2239 14 10.5C14 10.7761 13.7761 11 13.5 11H12C11.9833 11 11.9668 10.9992 11.9505 10.9976ZM9.5 9C8.67157 9 8 9.67157 8 10.5C8 11.3284 8.67157 12 9.5 12C10.3284 12 11 11.3284 11 10.5C11 9.67157 10.3284 9 9.5 9Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                        </svg>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className={cn("p-1 transition-all duration-150 rounded-xl shadow-lg border-gray-200/50", settingsView === 'layout' ? 'w-60' : 'w-52')}
                                    collisionPadding={16}
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                >
                                    {settingsView === 'main' ? (
                                        <>
                                            {/* Cohort Name Field */}
                                            <div className="px-1.5 pt-1 pb-2">
                                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Cohort Name</div>
                                                <div className="relative flex items-center">
                                                    <Pencil className="absolute left-2 w-3 h-3 text-gray-400 pointer-events-none" />
                                                    <input
                                                        className="w-full h-7 pl-6 pr-2 text-[12px] font-medium text-gray-800 bg-gray-50/50 border border-gray-100 rounded-md focus:outline-none focus:border-gray-300 focus:bg-white transition-all"
                                                        value={cohortNameInput}
                                                        onChange={(e) => setCohortNameInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                onCohortRename?.(cohortNameInput);
                                                                setIsSettingsDropdownOpen(false);
                                                            }
                                                            e.stopPropagation();
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        placeholder="Cohort name..."
                                                    />
                                                </div>
                                            </div>
                                            <DropdownMenuSeparator className="my-1" />
                                            {/* Menu Items */}
                                            <DropdownMenuItem
                                                className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] text-gray-700 rounded-md cursor-pointer"
                                                onClick={() => { onSettingsClick?.(); setIsSettingsDropdownOpen(false); }}
                                            >
                                                <Settings className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="flex-1 font-medium">Cohort Settings</span>
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] text-gray-700 rounded-md cursor-pointer"
                                                onSelect={(e) => e.preventDefault()}
                                                onClick={() => setSettingsView('layout')}
                                            >
                                                <LayoutDashboard className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="flex-1 font-medium">Layout</span>
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] text-gray-700 rounded-md cursor-pointer"
                                                onClick={() => {
                                                    setIsSettingsDropdownOpen(false);
                                                    if (isSortFilterBarOpen && barMode === 'filter') {
                                                        setIsSortFilterBarOpen(false);
                                                    } else {
                                                        setBarMode('filter');
                                                        setIsSortFilterBarOpen(true);
                                                    }
                                                }}
                                            >
                                                <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="flex-1 font-medium">Filter</span>
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] text-gray-700 rounded-md cursor-pointer"
                                                onClick={() => {
                                                    setIsSettingsDropdownOpen(false);
                                                    if (isSortFilterBarOpen && barMode === 'sort') {
                                                        setIsSortFilterBarOpen(false);
                                                    } else {
                                                        setBarMode('sort');
                                                        setIsSortFilterBarOpen(true);
                                                    }
                                                }}
                                            >
                                                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="flex-1 font-medium">Sort</span>
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] text-gray-700 rounded-md cursor-pointer"
                                                onClick={() => {
                                                    setIsSettingsDropdownOpen(false);
                                                    setTimeout(() => setIsColumnVisDropdownOpen(true), 50);
                                                }}
                                            >
                                                <Columns className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="flex-1 font-medium">Column Visibility</span>
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="my-1" />
                                            <DropdownMenuItem
                                                className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] text-gray-700 rounded-md cursor-pointer"
                                                onClick={() => {
                                                    setIsSettingsDropdownOpen(false);
                                                    onExport?.();
                                                }}
                                            >
                                                <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="flex-1 font-medium">Export as CSV</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] text-gray-700 rounded-md cursor-pointer"
                                                onClick={() => {
                                                    setIsSettingsDropdownOpen(false);
                                                    onImport?.();
                                                }}
                                            >
                                                <Upload className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="flex-1 font-medium">Import from CSV</span>
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        /* ── LAYOUT SUB-PANEL ── */
                                        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                            {/* Header */}
                                            <div className="flex items-center gap-2 px-1 py-1 mb-1">
                                                <button
                                                    className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                                                    onClick={() => setSettingsView('main')}
                                                >
                                                    <ArrowLeft className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="text-[12px] font-semibold text-gray-800">Layout</span>
                                            </div>

                                            {/* View Tiles */}
                                            <div className="grid grid-cols-2 gap-1.5 px-1 mb-3">
                                                {/* Table tile */}
                                                <button
                                                    onClick={() => { setLayoutView('table'); notifyLayoutPrefs({ layoutView: 'table' }); }}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-1.5 h-[64px] rounded-lg border-2 transition-all text-[11px] font-medium",
                                                        layoutView === 'table'
                                                            ? "border-blue-500 text-blue-600 bg-blue-50/50"
                                                            : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <Table2 className={cn("w-5 h-5", layoutView === 'table' ? "text-blue-500" : "text-gray-400")} />
                                                    Table
                                                </button>

                                                {/* Kanban tile */}
                                                <button
                                                    onClick={() => { setLayoutView('kanban'); notifyLayoutPrefs({ layoutView: 'kanban' }); }}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-1.5 h-[64px] rounded-lg border-2 transition-all text-[11px] font-medium",
                                                        layoutView === 'kanban'
                                                            ? "border-blue-500 text-blue-600 bg-blue-50/50"
                                                            : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <Kanban className={cn("w-5 h-5", layoutView === 'kanban' ? "text-blue-500" : "text-gray-400")} />
                                                    Kanban
                                                </button>
                                            </div>

                                            <DropdownMenuSeparator className="my-2 -mx-1.5" />

                                            {/* Show Vertical Lines */}
                                            <div className="flex items-center justify-between px-2 py-2">
                                                <span className="text-[12px] text-gray-700 font-medium">Show vertical lines</span>
                                                <Switch
                                                    checked={showVerticalLines}
                                                    onCheckedChange={(val) => { setShowVerticalLines(val); notifyLayoutPrefs({ showVerticalLines: val }); }}
                                                    className="h-4 w-7 data-[state=checked]:bg-blue-500"
                                                />
                                            </div>

                                            {/* Open Pages In */}
                                            <div className="flex items-center justify-between px-2 py-2">
                                                <span className="text-[12px] text-gray-700 font-medium">Open pages in</span>
                                                <div className="relative">
                                                    <button
                                                        className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-800 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); setOpenPagesDropdownOpen(v => !v); setLoadLimitDropdownOpen(false); }}
                                                    >
                                                        {openPagesIn === 'side-sheet' ? 'Side Sheet' : 'Center Sheet'}
                                                        {openPagesDropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                    </button>
                                                    {openPagesDropdownOpen && (
                                                        <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 w-[130px]">
                                                            {(['side-sheet', 'center-sheet'] as const).map(opt => (
                                                                <button
                                                                    key={opt}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 transition-colors",
                                                                        openPagesIn === opt ? "font-semibold text-blue-600" : "text-gray-700"
                                                                    )}
                                                                    onClick={(e) => { e.stopPropagation(); setOpenPagesIn(opt); setOpenPagesDropdownOpen(false); notifyLayoutPrefs({ openPagesIn: opt }); }}
                                                                >
                                                                    {opt === 'side-sheet' ? 'Side Sheet' : 'Center Sheet'}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Load Limit */}
                                            <div className="flex items-center justify-between px-2 py-2">
                                                <span className="text-[12px] text-gray-700 font-medium">Load limit</span>
                                                <div className="relative">
                                                    <button
                                                        className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-800 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); setLoadLimitDropdownOpen(v => !v); setOpenPagesDropdownOpen(false); }}
                                                    >
                                                        {loadLimit}
                                                        {loadLimitDropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                    </button>
                                                    {loadLimitDropdownOpen && (
                                                        <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 w-[80px]">
                                                            {([10, 25, 50, 100] as const).map(v => (
                                                                <button
                                                                    key={v}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 transition-colors",
                                                                        loadLimit === v ? "font-semibold text-blue-600" : "text-gray-700"
                                                                    )}
                                                                    onClick={(e) => { e.stopPropagation(); setLoadLimit(v); setLoadLimitDropdownOpen(false); notifyLayoutPrefs({ loadLimit: v }); }}
                                                                >
                                                                    {v}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                            Settings
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors"
                                onClick={onExport}
                                disabled={!onExport}
                            >
                                <Download className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Export as CSV
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            {isScoring ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 border-red-200 text-red-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 rounded-sm text-xs font-semibold ml-2 gap-1.5 transition-all animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                                    onClick={onCancelScoring}
                                >
                                    <CircleStop className="w-3.5 h-3.5" />
                                    Cancel
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 border-dashed border-gray-300 text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 rounded-sm text-xs font-medium ml-2 gap-1.5 transition-all"
                                    onClick={onRunAIReview}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Score
                                </Button>
                            )}
                        </TooltipTrigger>
                        <TooltipContent>
                            {isScoring ? "Stop the scoring process" : "Run scoring for all applicants"}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Secondary Filter/Sort Bar */}
            {isSortFilterBarOpen && barMode === 'sort' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-t border-gray-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <DataTableSortPopover table={table} program={program} />
                </div>
            )}

            {/* Filter Bar */}
            {isSortFilterBarOpen && barMode === 'filter' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-t border-gray-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2 overflow-x-auto flex-1 custom-scrollbar">
                        {/* Company Filter */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className={cn(
                                    "h-6 px-2 text-[13px] text-gray-500 hover:bg-gray-100 font-normal gap-1.5 rounded",
                                    pendingCompanies.length > 0 && "text-blue-600 bg-blue-50/50"
                                )}>
                                    Company
                                    {pendingCompanies.length > 0 && ` (${pendingCompanies.length})`}
                                    <ChevronDown className="w-3 h-3 text-gray-300" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48 p-1 rounded-xl shadow-lg border-gray-200/50" collisionPadding={16}>
                                {uniqueCompanies.length > 0 ? (
                                    uniqueCompanies.map((company) => (
                                        <DropdownMenuCheckboxItem
                                            key={company}
                                            checked={pendingCompanies.includes(company)}
                                            onCheckedChange={(checked) => {
                                                setPendingCompanies(prev =>
                                                    checked
                                                        ? [...prev, company]
                                                        : prev.filter(c => c !== company)
                                                )
                                            }}
                                            className="text-xs"
                                        >
                                            {company}
                                        </DropdownMenuCheckboxItem>
                                    ))
                                ) : (
                                    <div className="py-4 px-3 text-center">
                                        <p className="text-[11px] text-gray-400 font-medium">No results found</p>
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* AI Score Range */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className={cn(
                                    "h-6 px-2 text-[13px] text-gray-500 hover:bg-gray-100 font-normal gap-1.5 rounded",
                                    (pendingScoreRanges.overall[0] !== 0 || pendingScoreRanges.overall[1] !== 100) && "text-blue-600 bg-blue-50/50"
                                )}>
                                    AI Score
                                    <ChevronDown className="w-3 h-3 text-gray-300" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52 p-0 rounded-xl shadow-lg border-gray-200/50" collisionPadding={16}>
                                <div className="p-3 space-y-4">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{pendingScoreRanges.overall[0]}</span>
                                        <span>{pendingScoreRanges.overall[1]}</span>
                                    </div>
                                    <DualRangeSlider
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={pendingScoreRanges.overall}
                                        onValueChange={(value) => {
                                            setPendingScoreRanges(prev => ({ ...prev, overall: value as number[] }))
                                        }}
                                    />
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Rubric Score Ranges */}
                        {program.rubric.map((criterion) => (
                            <DropdownMenu key={criterion.id}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className={cn(
                                        "h-6 px-2 text-[13px] text-gray-500 hover:bg-gray-100 font-normal gap-1.5 rounded",
                                        (pendingScoreRanges[criterion.id]?.[0] !== 0 || pendingScoreRanges[criterion.id]?.[1] !== 100) && "text-blue-600 bg-blue-50/50"
                                    )}>
                                        {criterion.name}
                                        <ChevronDown className="w-3 h-3 text-gray-300" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-52 p-0 rounded-xl shadow-lg border-gray-200/50" collisionPadding={16}>
                                    <div className="p-3 space-y-4">
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>{pendingScoreRanges[criterion.id]?.[0] ?? 0}</span>
                                            <span>{pendingScoreRanges[criterion.id]?.[1] ?? 100}</span>
                                        </div>
                                        <DualRangeSlider
                                            min={0}
                                            max={100}
                                            step={1}
                                            value={pendingScoreRanges[criterion.id] || [0, 100]}
                                            onValueChange={(value) => {
                                                setPendingScoreRanges(prev => ({ ...prev, [criterion.id]: value as number[] }))
                                            }}
                                        />
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ))}

                        {/* Status Filter */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className={cn(
                                    "h-6 px-2 text-[13px] text-gray-500 hover:bg-gray-100 font-normal gap-1.5 rounded",
                                    pendingStatuses.length > 0 && "text-blue-600 bg-blue-50/50"
                                )}>
                                    Status
                                    {pendingStatuses.length > 0 && ` (${pendingStatuses.length})`}
                                    <ChevronDown className="w-3 h-3 text-gray-300" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-44 p-1 rounded-xl shadow-lg border-gray-200/50" collisionPadding={16}>
                                {uniqueStatuses.map((status) => {
                                    const statusColorClass = getStatusColor(status).split(' ')[0];
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={status}
                                            checked={pendingStatuses.includes(status)}
                                            onCheckedChange={(checked) => {
                                                setPendingStatuses(prev =>
                                                    checked
                                                        ? [...prev, status]
                                                        : prev.filter(s => s !== status)
                                                )
                                            }}
                                            className="text-xs"
                                        >
                                            <div className="flex items-center">
                                                <div className={cn("w-2 h-2 rounded-full mr-2", getStatusDotColor(status))} />
                                                {status}
                                            </div>
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Date Range Filter */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className={cn(
                                    "h-6 px-2 text-[13px] text-gray-500 hover:bg-gray-100 font-normal gap-1.5 rounded",
                                    pendingDateRange && "text-blue-600 bg-blue-50/50"
                                )}>
                                    Submitted
                                    <ChevronDown className="w-3 h-3 text-gray-300" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="bottom" align="end" className="w-auto p-0" sideOffset={10} collisionPadding={20}>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-gray-50/50">
                                        <div className="flex flex-col gap-1 flex-1">
                                            <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Start Date</span>
                                            <div className="h-8 flex items-center px-2 bg-white border border-gray-200 rounded text-[11px] text-gray-600">
                                                {pendingDateRange?.from ? format(pendingDateRange.from, "MMM dd, yyyy") : "None"}
                                            </div>
                                        </div>
                                        <div className="mt-4 text-gray-300">
                                            <MoreHorizontal className="w-3 h-3" />
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">End Date</span>
                                            <div className="h-8 flex items-center px-2 bg-white border border-gray-200 rounded text-[11px] text-gray-600">
                                                {pendingDateRange?.to ? format(pendingDateRange.to, "MMM dd, yyyy") : "None"}
                                            </div>
                                        </div>
                                    </div>
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={pendingDateRange?.from}
                                        selected={pendingDateRange}
                                        onSelect={setPendingDateRange}
                                        numberOfMonths={2}
                                        className="p-2 [--cell-size:28px]"
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="w-[1px] h-4 bg-gray-100 mx-1" />

                    {/* Apply and Clear Buttons */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[13px] text-gray-500 hover:bg-gray-100 font-normal rounded"
                            onClick={() => {
                                // Clear all pending filters
                                setPendingCompanies([])
                                setPendingStatuses([])
                                setPendingScoreRanges(initialScoreRanges)
                                setPendingDateRange(undefined)

                                // Clear all active filters
                                table.getAllColumns().forEach(column => {
                                    column.setFilterValue(undefined)
                                })
                            }}
                        >
                            Clear
                        </Button>
                        <Button
                            size="sm"
                            className="h-6 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium"
                            onClick={() => {
                                // Apply Company filter
                                if (pendingCompanies.length > 0) {
                                    table.getColumn("companyName")?.setFilterValue(pendingCompanies)
                                } else {
                                    table.getColumn("companyName")?.setFilterValue(undefined)
                                }

                                // Apply Status filter
                                if (pendingStatuses.length > 0) {
                                    table.getColumn("status")?.setFilterValue(pendingStatuses)
                                } else {
                                    table.getColumn("status")?.setFilterValue(undefined)
                                }

                                // Apply Score range filters
                                const applyRangeFilter = (columnId: string, range: number[]) => {
                                    const column = table.getColumn(columnId);
                                    if (!column) return;

                                    if (range && (range[0] !== 0 || range[1] !== 100)) {
                                        column.setFilterValue(range)
                                    } else {
                                        column.setFilterValue(undefined)
                                    }
                                }

                                applyRangeFilter("overallScore", pendingScoreRanges.overall)

                                // Apply rubric score filters
                                program.rubric.forEach(criterion => {
                                    applyRangeFilter(`score_${criterion.id}`, pendingScoreRanges[criterion.id])
                                })

                                // Apply Date range filter
                                if (pendingDateRange?.from) {
                                    table.getColumn("submittedDate")?.setFilterValue(pendingDateRange)
                                } else {
                                    table.getColumn("submittedDate")?.setFilterValue(undefined)
                                }
                            }}
                        >
                            Apply Filters
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}) as <TData>(props: DataTableToolbarProps<TData> & { ref?: React.Ref<DataTableToolbarHandle> }) => React.ReactElement;
