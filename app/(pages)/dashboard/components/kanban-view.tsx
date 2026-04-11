"use client"

import React, { useState } from "react"
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    useDraggable,
} from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { Application } from "./columns"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

// ─── Status configuration ───────────────────────────────────────────────────

const STATUSES = ["New", "Reviewing", "Shortlist", "Interview", "Accepted", "Rejected"] as const
type Status = typeof STATUSES[number]

const STATUS_STYLES: Record<Status, { col: string; header: string; dot: string; badge: string }> = {
    New:       { col: "bg-blue-50/60",   header: "text-blue-700",   dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700" },
    Reviewing: { col: "bg-gray-100/60",  header: "text-gray-600",   dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-700" },
    Shortlist: { col: "bg-green-50/60",  header: "text-green-700",  dot: "bg-green-500",  badge: "bg-green-100 text-green-800" },
    Interview: { col: "bg-purple-50/60", header: "text-purple-700", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-800" },
    Accepted:  { col: "bg-teal-50/60",   header: "text-teal-700",   dot: "bg-teal-500",   badge: "bg-teal-100 text-teal-800" },
    Rejected:  { col: "bg-red-50/50",    header: "text-red-600",    dot: "bg-red-400",    badge: "bg-red-100 text-red-700" },
}

// ─── Score colour helper ─────────────────────────────────────────────────────

function scoreColor(score: number) {
    if (score >= 76) return "bg-green-100 text-green-800"
    if (score >= 51) return "bg-yellow-100 text-yellow-800"
    if (score > 0)   return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-400"
}

// ─── Droppable column ────────────────────────────────────────────────────────

function KanbanColumn({
    status,
    cards,
    isOver,
    onCardClick,
}: {
    status: Status
    cards: Application[]
    isOver: boolean
    onCardClick: (app: Application) => void
}) {
    const { setNodeRef } = useDroppable({ id: status })
    const style = STATUS_STYLES[status]

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col rounded-xl border border-transparent min-w-[250px] w-full flex-1 h-full min-h-full transition-colors duration-150",
                style.col,
                isOver && "border-dashed border-gray-300 bg-opacity-80"
            )}
        >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <div className={cn("w-2 h-2 rounded-full shrink-0", style.dot)} />
                <span className={cn("text-[12px] font-semibold uppercase tracking-wider", style.header)}>
                    {status}
                </span>
                <span className="ml-auto text-[11px] text-gray-400 font-medium tabular-nums">
                    {cards.length}
                </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 px-2 pb-3 flex-1">
                {cards.map((app) => (
                    <DraggableCard key={app.id} app={app} onCardClick={onCardClick} />
                ))}

                {/* Empty state */}
                {cards.length === 0 && (
                    <div className="flex-1 flex items-center justify-center py-8">
                        <span className="text-[11px] text-gray-300 select-none">No applicants</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Draggable card ──────────────────────────────────────────────────────────

function DraggableCard({
    app,
    onCardClick,
    ghost = false,
}: {
    app: Application
    onCardClick: (app: Application) => void
    ghost?: boolean
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id })

    return (
        <div
            ref={ghost ? undefined : setNodeRef}
            {...(ghost ? {} : { ...listeners, ...attributes })}
            onClick={(e) => {
                // Only open sheet if it wasn't a drag
                e.stopPropagation()
                onCardClick(app)
            }}
            className={cn(
                "bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-pointer select-none",
                "hover:shadow-md hover:border-gray-200 transition-all duration-150 group",
                isDragging && !ghost && "opacity-30 pointer-events-none",
                ghost && "rotate-1 shadow-xl scale-[1.02] opacity-95"
            )}
        >
            {/* Applicant name */}
            <p className="text-[13px] font-semibold text-gray-900 leading-tight mb-2 truncate group-hover:text-blue-600 transition-colors">
                {app.applicantName || "Anonymous"}
            </p>

            {/* AI Score */}
            <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-gray-300 shrink-0" />
                {app.overallScore && app.overallScore > 0 ? (
                    <Badge
                        variant="secondary"
                        className={cn(
                            "text-[10px] font-medium px-1.5 py-0 h-4 rounded-full border-0",
                            scoreColor(app.overallScore)
                        )}
                    >
                        {app.overallScore}/100
                    </Badge>
                ) : (
                    <span className="text-[10px] text-gray-300 font-medium">Not reviewed</span>
                )}
            </div>

            {/* Date submitted */}
            <p className="text-[10px] text-gray-400 tabular-nums">
                {app.submittedDate
                    ? new Date(app.submittedDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                      })
                    : "—"}
            </p>
        </div>
    )
}

// ─── Ghost overlay card (shown while dragging) ───────────────────────────────

function GhostCard({ app }: { app: Application }) {
    return <DraggableCard app={app} onCardClick={() => {}} ghost />
}

// ─── Main KanbanView ─────────────────────────────────────────────────────────

interface KanbanViewProps {
    data: Application[]
    onStatusChange?: (id: string, status: string) => void
    onCardClick: (app: Application) => void
    loadLimit?: number
}

export function KanbanView({ data, onStatusChange, onCardClick, loadLimit = 50 }: KanbanViewProps) {
    const [activeCard, setActiveCard] = useState<Application | null>(null)
    const [overColumn, setOverColumn] = useState<string | null>(null)

    // Local optimistic status map: id → status, so cards move immediately on drop
    const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    )

    const effectiveStatus = (app: Application): string =>
        localStatuses[app.id] ?? app.status ?? "New"

    const slicedData = data.slice(0, loadLimit)

    const cardsByStatus = (status: Status): Application[] =>
        slicedData.filter((a) => (effectiveStatus(a) || "New").toLowerCase() === status.toLowerCase())

    const handleDragStart = (event: DragStartEvent) => {
        const app = slicedData.find((a) => a.id === event.active.id)
        if (app) setActiveCard(app)
    }

    const handleDragOver = (event: DragOverEvent) => {
        setOverColumn(event.over ? String(event.over.id) : null)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveCard(null)
        setOverColumn(null)

        const { active, over } = event
        if (!over) return

        const draggedId = String(active.id)
        const newStatus = String(over.id)
        const app = slicedData.find((a) => a.id === draggedId)
        if (!app) return

        const currentStatus = effectiveStatus(app)
        if (currentStatus.toLowerCase() === newStatus.toLowerCase()) return

        // Optimistic update
        setLocalStatuses((prev) => ({ ...prev, [draggedId]: newStatus }))
        // Persist
        onStatusChange?.(draggedId, newStatus)
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-3 h-full min-h-full flex-1 overflow-x-auto px-4 pb-4 pt-2">
                {STATUSES.map((status) => (
                    <KanbanColumn
                        key={status}
                        status={status}
                        cards={cardsByStatus(status)}
                        isOver={overColumn === status}
                        onCardClick={onCardClick}
                    />
                ))}
            </div>

            <DragOverlay dropAnimation={null}>
                {activeCard ? <GhostCard app={activeCard} /> : null}
            </DragOverlay>
        </DndContext>
    )
}
