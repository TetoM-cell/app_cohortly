"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { DataTableToolbar, DataTableToolbarHandle } from "./data-table-toolbar"
import { cn } from "@/lib/utils"
import { Plus, Activity, Hash, ListTodo, Trash2, MoreHorizontal, UsersRound, TrendingUp, Target, UserPlus, Mail, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanView } from "./kanban-view"
import { ApplicantSheet } from "./applicant-sheet"

import { getColumns, Application, Criterion, getStatusDotColor } from "./columns"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { usePreferences } from "@/app/context/preferences-context"
import { useDashboardHotkeys } from "@/hooks/use-hotkeys"
import { useHotkeyStore } from "@/hooks/use-hotkey-store"

interface LayoutPrefs {
    showVerticalLines: boolean
    openPagesIn: 'side-sheet' | 'center-sheet'
    loadLimit: 10 | 25 | 50 | 100
    layoutView: 'table' | 'kanban'
}

interface DataTableProps<TData extends Application> {
    data: TData[]
    program: {
        rubric: Criterion[]
        [key: string]: any
    }
    onSelectionChange?: (count: number) => void
    onComment?: (id: string, text: string, columnId?: string) => void
    onDeleteComment?: (id: string) => void
    currentUserProfile?: any
    onScoreChange?: (applicantId: string, criterionId: string, score: number) => void
    onStatusChange?: (id: string, status: string) => void
    onRefresh?: () => void
    onBulkDelete?: (ids: string[]) => void
    onBulkStatusChange?: (ids: string[], status: string) => void
    onBulkEmail?: (ids: string[], emailType?: string) => void
    onBulkInviteReviewers?: (ids: string[]) => void
    onBulkRunAIReview?: (ids: string[]) => void
    onRunAIReview?: () => void
    isScoring?: boolean
    onCancelScoring?: () => void
    onSettingsClick?: () => void
    onCohortRename?: (name: string) => void
    onExport?: () => void
    onImport?: () => void
    currentPage?: number
    pageSize?: number
    totalCount?: number
    onPageChange?: (page: number) => void
    onPageSizeChange?: (pageSize: 10 | 25 | 50 | 100) => void
    loadApplicantComments?: (applicantId: string) => Promise<Record<string, any[]>>
    onQueryStateChange?: (queryState: { sorting: SortingState; columnFilters: ColumnFiltersState }) => void
}

export function DataTable<TData extends Application>({
    data,
    program,
    onSelectionChange,
    onComment,
    onDeleteComment,
    currentUserProfile,
    onScoreChange,
    onStatusChange,
    onRefresh,
    onBulkDelete,
    onBulkStatusChange,
    onBulkEmail,
    onBulkInviteReviewers,
    onBulkRunAIReview,
    onRunAIReview,
    isScoring,
    onCancelScoring,
    onSettingsClick,
    onCohortRename,
    onExport,
    onImport,
    currentPage = 1,
    pageSize = 50,
    totalCount = 0,
    onPageChange,
    onPageSizeChange,
    loadApplicantComments,
    onQueryStateChange,
}: DataTableProps<TData>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [activeApplicantId, setActiveApplicantId] = React.useState<string | null>(null)
    const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1)
    const [loadedCommentsByApplicant, setLoadedCommentsByApplicant] = React.useState<Record<string, Record<string, any[]>>>({})
    const [layoutPrefs, setLayoutPrefs] = React.useState<LayoutPrefs>({
        showVerticalLines: true,
        openPagesIn: 'side-sheet',
        loadLimit: pageSize as 10 | 25 | 50 | 100,
        layoutView: 'table',
    })

    // Internal ref for reaching into the toolbar via hotkeys
    const internalToolbarRef = React.useRef<DataTableToolbarHandle>(null)

    // Density preference
    const { preferences } = usePreferences()
    const densityClass = preferences.density === "compact" ? "h-[26px]" : "h-[34px]"

    const columns = React.useMemo(() => getColumns(program.rubric, onStatusChange), [program.rubric, onStatusChange])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        getRowId: (row) => (row as any).id,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        manualSorting: true,
        manualFiltering: true,
        enableMultiSort: true,
        isMultiSortEvent: () => true,
        meta: {
            onComment: (id: string, text: string, columnId?: string) => {
                if (onComment) {
                    onComment(id, text, columnId)
                }
            },
            onDeleteComment: (id: string) => {
                if (onDeleteComment) {
                    onDeleteComment(id)
                }
            },
            currentUserProfile,
            reviewers: program.reviewers || [],
            formFields: program.formFields || [],
            activeApplicantId,
            setActiveApplicantId,
            onScoreChange: (applicantId: string, criterionId: string, score: number) => {
                if (onScoreChange) {
                    onScoreChange(applicantId, criterionId, score)
                }
            },
            onStatusChange: (id: string, status: string) => {
                if (onStatusChange) {
                    onStatusChange(id, status)
                }
            },
            onBulkStatusChange: (ids: string[], status: string) => onBulkStatusChange?.(ids, status),
            onBulkRunAIReview: (ids: string[]) => onBulkRunAIReview?.(ids),
            onCancelScoring: () => onCancelScoring?.(),
            blindReview: program.blind_review,
        },
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    const selectedRowsCount = table.getFilteredSelectedRowModel().rows.length;
    const selectedIds = React.useMemo(() => table.getFilteredSelectedRowModel().rows.map(row => (row.original as Application).id), [table.getFilteredSelectedRowModel().rows]);

    // Notify parent of selection changes
    React.useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedRowsCount)
        }
    }, [selectedRowsCount, onSelectionChange])

    React.useEffect(() => {
        onQueryStateChange?.({ sorting, columnFilters })
    }, [sorting, columnFilters, onQueryStateChange])

    // Keep focusedRowIndex in bounds when data changes
    const rows = table.getRowModel().rows;

    // Scroll focused row into view
    React.useEffect(() => {
        if (focusedRowIndex >= 0) {
            const row = document.querySelector(`tr[data-focused="true"]`);
            if (row) {
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [focusedRowIndex]);

    React.useEffect(() => {
        if (focusedRowIndex >= rows.length) {
            setFocusedRowIndex(rows.length - 1);
        }
    }, [rows.length, focusedRowIndex]);

    React.useEffect(() => {
        setLayoutPrefs((prev) => ({
            ...prev,
            loadLimit: pageSize as 10 | 25 | 50 | 100,
        }))
    }, [pageSize])

    React.useEffect(() => {
        if (!activeApplicantId || !loadApplicantComments || loadedCommentsByApplicant[activeApplicantId]) {
            return
        }

        let cancelled = false
        loadApplicantComments(activeApplicantId).then((comments) => {
            if (cancelled) return
            setLoadedCommentsByApplicant((prev) => ({
                ...prev,
                [activeApplicantId]: comments,
            }))
        }).catch(() => {
            // Leave comment loading failures to the parent fetch path.
        })

        return () => {
            cancelled = true
        }
    }, [activeApplicantId, loadApplicantComments, loadedCommentsByApplicant])

    // Wire up dashboard hotkeys
    useDashboardHotkeys({
        focusSearch: () => internalToolbarRef.current?.focusSearch(),
        toggleFilter: () => internalToolbarRef.current?.toggleFilter(),
        toggleSort: () => internalToolbarRef.current?.toggleSort(),
        refreshData: () => onRefresh?.(),
        selectNextRow: () => setFocusedRowIndex(i => Math.min(rows.length - 1, i < 0 ? 0 : i + 1)),
        selectPrevRow: () => setFocusedRowIndex(i => Math.max(0, i - 1)),
        openSelected: () => {
            if (focusedRowIndex >= 0 && rows[focusedRowIndex]) {
                const rowId = rows[focusedRowIndex].id;
                setActiveApplicantId(prev => prev === rowId ? null : rowId);
            }
        },
        closeSheet: () => setActiveApplicantId(null),
    });

    return (
        <div className="flex flex-col bg-white overflow-hidden relative w-full h-full">
            {/* Toolbar - Fixed */}
            <div className="flex-none">
                <DataTableToolbar
                    table={table}
                    program={program}
                    ref={internalToolbarRef}
                    onRunAIReview={onRunAIReview}
                    isScoring={isScoring}
                    onCancelScoring={onCancelScoring}
                    onSettingsClick={onSettingsClick}
                    onCohortRename={onCohortRename}
                    onLayoutPrefsChange={(prefs) => {
                        setLayoutPrefs(prefs)
                        if (prefs.loadLimit !== layoutPrefs.loadLimit) {
                            onPageSizeChange?.(prefs.loadLimit)
                        }
                    }}
                    onExport={onExport}
                    onImport={onImport}
                />
            </div>

            {/* Table Container - Scrollable */}
            <div className="flex-1 min-h-0 overflow-auto relative border border-gray-100 rounded-xl bg-white mt-2 custom-scrollbar flex flex-col">
                {layoutPrefs.layoutView === 'table' ? (
                    <Table className="border-0 w-full min-w-max" id="dashboard-table">
                        <TableHeader className="bg-white sticky top-0 z-30 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent border-none group/header">
                                    {headerGroup.headers.map((header, index) => {
                                        const isFirst = index === 0
                                        const isLast = index === headerGroup.headers.length - 1

                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={cn(
                                                    "h-9 text-xs font-normal text-gray-500 bg-white border-b border-gray-100",
                                                    isFirst && "sticky left-0 z-30"
                                                )}
                                                style={{
                                                    width: header.getSize(),
                                                    minWidth: header.getSize(),
                                                    maxWidth: header.getSize(),
                                                }}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row, rowIndex) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        data-active={activeApplicantId === row.id}
                                        data-focused={focusedRowIndex === rowIndex}
                                        className="group/row hover:bg-gray-50/50 border-b border-gray-100/50 transition-colors data-[active=true]:bg-blue-50/50 data-[state=selected]:bg-blue-50/30 data-[focused=true]:ring-1 data-[focused=true]:ring-inset data-[focused=true]:ring-blue-300"
                                    >
                                        {row.getVisibleCells().map((cell, index) => {
                                            const isFirst = index === 0
                                            const isLast = index === row.getVisibleCells().length - 1

                                            return (
                                                <TableCell
                                                    key={cell.id}
                                                    className={cn(
                                                    "py-0 font-normal text-sm bg-white transition-colors relative",
                                                    layoutPrefs.showVerticalLines ? "border-r border-gray-200 last:border-r-0" : "border-r-0",
                                                    "group-hover/row:bg-gray-50/50",
                                                    "group-data-[active=true]:bg-blue-50/50 group-data-[active=true]:border-y-blue-200 group-data-[active=true]:z-30",
                                                    "group-data-[state=selected]:bg-blue-50/30",
                                                    densityClass,
                                                    isFirst && "sticky left-0 z-20",
                                                    isFirst && "group-data-[active=true]:after:absolute group-data-[active=true]:after:left-0 group-data-[active=true]:after:top-0 group-data-[active=true]:after:bottom-0 group-data-[active=true]:after:w-[3px] group-data-[active=true]:after:bg-blue-500"
                                                )}
                                                    style={{
                                                        width: cell.column.getSize(),
                                                        minWidth: cell.column.getSize(),
                                                        maxWidth: cell.column.getSize(),
                                                    }}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500 text-sm">
                                        No results yet
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                ) : (
                    <KanbanView
                        data={table.getFilteredRowModel().rows.map(r => r.original)}
                        onStatusChange={onStatusChange}
                        onCardClick={(app) => setActiveApplicantId(app.id)}
                        loadLimit={layoutPrefs.loadLimit}
                    />
                )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
                <span>
                    Page {currentPage} of {Math.max(1, Math.ceil(totalCount / pageSize))} · {totalCount} applicants
                </span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onPageChange?.(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onPageChange?.(currentPage + 1)}
                        disabled={currentPage >= Math.max(1, Math.ceil(totalCount / pageSize))}
                    >
                        Next
                    </Button>
                </div>
            </div>

            {/* Floating Selection Toolbar */}
            {selectedRowsCount > 0 && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-px p-0.5 bg-[#191919] text-[#ffffffd9] rounded-lg shadow-xl border border-[#ffffff0d]">
                        <div className="px-3 py-1 text-sm font-medium border-r border-[#ffffff0d] text-blue-400">
                            {selectedRowsCount} selected
                        </div>
                        <div className="flex items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-[#ffffff73] hover:text-[#ffffffd9] hover:bg-[#ffffff1a] rounded-none"
                                            >
                                                <Mail className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center" className="w-40 bg-[#191919] border-[#ffffff0d] text-[#ffffff73]">
                                            {["Accepted", "Shortlisted", "Rejected"].map((type) => (
                                                <DropdownMenuItem
                                                    key={type}
                                                    className="cursor-pointer hover:text-[#ffffffd9] focus:text-[#ffffffd9] hover:bg-[#ffffff1a] focus:bg-[#ffffff1a]"
                                                    onClick={() => onBulkEmail?.(selectedIds, type)}
                                                >
                                                    {type}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    Send email
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-[#ffffff73] hover:text-[#ffffffd9] hover:bg-[#ffffff1a] rounded-none"
                                        onClick={() => onBulkInviteReviewers?.(selectedIds)}
                                    >
                                        <UserPlus className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    Invite Reviewers
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-[#ffffff73] hover:text-[#ffffffd9] hover:bg-[#ffffff1a] rounded-none"
                                        onClick={() => onBulkRunAIReview?.(selectedIds)}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    Run AI Review
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#ffffff73] hover:text-[#ffffffd9] hover:bg-[#ffffff1a] rounded-none">
                                                <ListTodo className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center" className="w-40 bg-[#191919] border-[#ffffff0d] text-[#ffffff73]">
                                            {["New", "Reviewing", "Shortlist", "Interview", "Accepted", "Rejected"].map((s) => (
                                                <DropdownMenuItem
                                                    key={s}
                                                    className="flex items-center gap-2 cursor-pointer hover:text-[#ffffffd9] focus:text-[#ffffffd9] hover:bg-[#ffffff1a] focus:bg-[#ffffff1a]"
                                                    onClick={() => onBulkStatusChange?.(selectedIds, s)}
                                                >
                                                    <div className={cn("w-2 h-2 rounded-full", getStatusDotColor(s))} />
                                                    {s}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    Update Status
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-[#ffffff73] hover:text-red-400 hover:bg-[#ffffff1a] rounded-l-none rounded-r-lg"
                                        onClick={() => onBulkDelete?.(selectedIds)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    Delete selected
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            )}

            <ApplicantSheet
                applicant={(() => {
                    const selectedApplicant = data.find(a => a.id === activeApplicantId) || null
                    if (!selectedApplicant) return null

                    const loadedComments = loadedCommentsByApplicant[selectedApplicant.id]
                    if (!loadedComments) return selectedApplicant

                    return {
                        ...selectedApplicant,
                        comments: loadedComments,
                    }
                })()}
                isOpen={!!activeApplicantId}
                onOpenChange={(open) => !open && setActiveApplicantId(null)}
                rubric={program.rubric}
                tableMeta={table.options.meta}
                hasNext={(() => {
                    const rows = table.getFilteredRowModel().rows
                    const idx = rows.findIndex(r => r.original.id === activeApplicantId)
                    return idx !== -1 && idx < rows.length - 1
                })()}
                hasPrev={(() => {
                    const rows = table.getFilteredRowModel().rows
                    const idx = rows.findIndex(r => r.original.id === activeApplicantId)
                    return idx > 0
                })()}
                onNext={() => {
                    const rows = table.getFilteredRowModel().rows
                    const idx = rows.findIndex(r => r.original.id === activeApplicantId)
                    if (idx !== -1 && idx < rows.length - 1) setActiveApplicantId(rows[idx + 1].original.id)
                }}
                onPrev={() => {
                    const rows = table.getFilteredRowModel().rows
                    const idx = rows.findIndex(r => r.original.id === activeApplicantId)
                    if (idx > 0) setActiveApplicantId(rows[idx - 1].original.id)
                }}
                viewMode={layoutPrefs.openPagesIn}
            />
        </div>
    )
}
