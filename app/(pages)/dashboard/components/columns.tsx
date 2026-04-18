"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    CheckCircle,
    Target,
    Activity,
    Trash2,
    MoreHorizontal,
    UsersRound,
    ArrowUpDown,
    Plus,
    X,
    MessageSquare,
    Loader2,
    Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Reviewer } from "@/components/ui/mention-dropdown"

export type Criterion = {
    id: string
    name: string
    weight: number
}

export type Comment = {
    id: string
    text: string
    userId: string
    createdAt: string
    columnId?: string
    user?: {
        name: string
        avatarUrl?: string
    }
}

export type Application = {
    id: string
    applicantName: string
    companyName: string
    overallScore: number
    status: string
    submittedDate: string
    hasComment?: boolean
    scores?: Record<string, number>
    comments?: Record<string, Comment[]>
    isManualEntry?: boolean
    answers?: any
    aiExplanation?: string
}

export const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
        case "new": return <Plus className="w-3 h-3 mr-1" />
        case "reviewing": return <Loader2 className="w-3 h-3 mr-1 animate-spin text-amber-500" />
        case "shortlist": return <Target className="w-3 h-3 mr-1" />
        case "interview": return <UsersRound className="w-3 h-3 mr-1" />
        case "accepted": return <CheckCircle className="w-3 h-3 mr-1" />
        case "rejected": return <X className="w-3 h-3 mr-1" />
        case "scored": return <Zap className="w-3 h-3 mr-1 text-purple-500" />
        default: return null
    }
}

export const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
        case "new": return "bg-blue-100/60 text-blue-700 hover:bg-blue-200/60"
        case "reviewing": return "bg-gray-100/80 text-gray-700 hover:bg-gray-200/80"
        case "shortlist": return "bg-green-100/60 text-green-800 hover:bg-green-200/60"
        case "interview": return "bg-purple-100/60 text-purple-800 hover:bg-purple-200/60"
        case "accepted": return "bg-teal-100/60 text-teal-800 hover:bg-teal-200/60"
        case "rejected": return "bg-red-100/60 text-red-800 hover:bg-red-200/60"
        case "scored": return "bg-purple-100/60 text-purple-800 hover:bg-purple-200/60"
        default: return "bg-gray-100 text-gray-700"
    }
}

export const getStatusDotColor = (status: string) => {
    switch (status?.toLowerCase()) {
        case "new": return "bg-blue-500"
        case "reviewing": return "bg-gray-400"
        case "shortlist": return "bg-green-500"
        case "interview": return "bg-purple-500"
        case "accepted": return "bg-teal-500"
        case "rejected": return "bg-red-500"
        case "scored": return "bg-purple-500"
        default: return "bg-gray-400"
    }
}

export const getScoreColor = (score: number) => {
    if (score >= 76) return "bg-green-100/60 text-green-800"
    if (score >= 51) return "bg-yellow-100/60 text-yellow-800"
    return "bg-red-100/60 text-red-800"
}

const NotionHeader = ({ title, className }: { title: string, className?: string }) => (
    <div className={cn("flex items-center gap-2 text-gray-500 font-normal pl-1", className)}>
        <span className="text-[13px] whitespace-nowrap">{title}</span>
    </div>
)

const AIWarning = () => (
    <Tooltip>
        <TooltipTrigger asChild>
            <div className="ml-1 cursor-help inline-flex items-center">
                <Activity className="w-3 h-3 text-amber-500 animate-pulse" />
            </div>
        </TooltipTrigger>
        <TooltipContent side="top">
            <p className="text-xs">This row was created manually and will not be reviewed by AI.</p>
        </TooltipContent>
    </Tooltip>
)

const CellWithComment = ({ row, children, className }: { row: any, children: React.ReactNode, className?: string }) => {
    // Check if there are ANY comments for this record across all possible categories (general, companyName, etc.)
    const commentsMap = row.original.comments || {}
    const hasComments = Object.values(commentsMap).some((comments: any) => comments.length > 0)

    return (
        <div className={cn("relative group w-full h-full flex items-center", className)}>
            {children}
            {hasComments && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="absolute top-0 right-1 -mt-1 cursor-help z-50">
                            <MessageSquare className="w-3 h-3 text-muted-foreground/60 fill-muted-foreground/10" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end">
                        <p>Someone added a Comment!</p>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    )
}

const ApplicantCell = ({ row, table }: { row: any, table: any }) => {
    const meta = table.options.meta as any
    const name = row.getValue("applicantName") || 'Anonymous'
    const hasComment = row.original.hasComment

    return (
        <div
            className={cn(
                "font-medium text-sm cursor-pointer hover:underline decoration-gray-300 underline-offset-4 pl-1 transition-colors",
                hasComment ? "text-blue-600" : "text-gray-900"
            )}
            onClick={() => meta.setActiveApplicantId(row.original.id)}
        >
            {name}
        </div>
    )
}

export const getColumns = (rubric: Criterion[], onStatusChange?: (id: string, status: string) => void): ColumnDef<Application>[] => [
    {
        id: "select",
        header: ({ table }) => (
            <div className="flex items-center justify-start pl-1 w-full">
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                />
            </div>
        ),
        cell: ({ row }) => (
            <div className="flex items-center justify-start pl-1 w-full">
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-[2px]"
                />
            </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
    },
    {
        accessorKey: "applicantName",
        header: () => <NotionHeader title="Applicant" />,
        cell: ({ row, table }) => (
            <CellWithComment row={row}>
                <ApplicantCell row={row} table={table} />
            </CellWithComment>
        ),
        size: 140,
    },
    {
        accessorKey: "companyName",
        header: () => <NotionHeader title="Company" />,
        cell: ({ row }) => <div className="text-gray-700 text-sm pl-1">{row.getValue("companyName")}</div>,
        size: 140,
    },
    {
        accessorKey: "overallScore",
        header: () => <NotionHeader title="AI Score" />,
        cell: ({ row }) => {
            const score = row.getValue("overallScore") as number
            const isManual = (row.original as Application).isManualEntry
            const status = ((row.original as Application).status || "").toLowerCase()
            const isReviewing = status === "reviewing"

            if (isReviewing) {
                return (
                    <div className="pl-1 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                        <span className="text-blue-500 italic text-xs font-normal">Reviewing...</span>
                    </div>
                )
            }

            if (!score || score === 0) {
                return (
                    <div className="pl-1">
                        <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Not yet Review</span>
                    </div>
                )
            }

            return (
                <div className="pl-1 flex items-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary" className={cn("font-normal text-xs px-2 py-0.5 rounded-full border-0 cursor-help", getScoreColor(score))}>
                                    {score}/100
                                </Badge>
                            </TooltipTrigger>
                            {row.original.aiExplanation && (
                                <TooltipContent side="top" className="max-w-xs p-3">
                                    <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                                        <Zap className="w-3 h-3 text-amber-500" />
                                        AI Reasoning Summary
                                    </p>
                                    <p className="text-[11px] leading-relaxed text-gray-200">
                                        {row.original.aiExplanation}
                                    </p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                    {isManual && <AIWarning />}
                </div>
            )
        },
        size: 140,
    },
    // DYNAMIC RUBRIC COLUMNS
    ...rubric.map(c => ({
        id: `score_${c.id}`,
        accessorFn: (row: Application) => row.scores?.[c.id] || 0,
        header: () => <NotionHeader title={c.name} />,
        meta: { title: c.name },
        cell: ({ row }: { row: any }) => {
            const score = row.original.scores?.[c.id] || 0
            return (
                <div className="text-sm text-gray-600 pl-1">{score}/100</div>
            )
        },
        size: 140,
    })),
    {
        accessorKey: "status",
        header: () => <NotionHeader title="Status" />,
        cell: ({ row, table }) => {
            const status = row.getValue("status") as string
            const id = row.original.id
            const statuses = ["New", "Reviewing", "Scored", "Shortlist", "Interview", "Accepted", "Rejected"]

            return (
                <div className="pl-1 text-sm">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "px-2.5 py-0.5 rounded-sm text-xs font-normal shadow-none inline-flex items-center cursor-pointer transition-opacity hover:opacity-80",
                                    getStatusColor(status)
                                )}
                            >
                                {getStatusIcon(status)}
                                {status}
                            </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                            {statuses.map((s) => (
                                <DropdownMenuItem
                                    key={s}
                                    className={cn(
                                        "flex items-center gap-2 cursor-pointer",
                                        status === s && "bg-gray-50"
                                    )}
                                    onClick={() => {
                                        if (onStatusChange) {
                                            onStatusChange(id, s)
                                        } else {
                                            // Fallback to table meta if provided through useReactTable
                                            const meta = table.options.meta as any;
                                            if (meta?.onStatusChange) {
                                                meta.onStatusChange(id, s);
                                            }
                                        }
                                    }}
                                >
                                    <div className={cn("w-2 h-2 rounded-full", getStatusDotColor(s))} />
                                    {s}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
        size: 140,
    },
    {
        accessorKey: "submittedDate",
        header: () => <NotionHeader title="Submitted" />,
        cell: ({ row }) => (
            <div className="text-gray-500 text-xs pl-1">
                {new Date(row.getValue("submittedDate")).toLocaleDateString()}
            </div>
        ),
        size: 140,
    }
]
