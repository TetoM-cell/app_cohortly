"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
    MessageSquare,
    Sparkles,
    ChevronUp,
    ChevronDown,
    Trash2,
    AtSign,
    ArrowUp,
    Video,
    FileText,
    ExternalLink,
    Maximize2,
    Download,
    Eye,
    EyeOff,
    Lock,
    Activity,
    Hash,
    Plus,
    Clock,
    History,
    Building2,
    Calendar,
    X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MentionDropdown, Reviewer } from "@/components/ui/mention-dropdown"
import {
    Application,
    Criterion,
    getStatusColor,
    getScoreColor,
    getStatusIcon,
    getStatusDotColor,
    Comment
} from "./columns"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ApplicantSheetProps {
    applicant: Application | null
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    rubric: Criterion[]
    tableMeta: any
    hasNext?: boolean
    hasPrev?: boolean
    onNext?: () => void
    onPrev?: () => void
    viewMode?: 'side-sheet' | 'center-sheet'
}

export function ApplicantSheet({
    applicant,
    isOpen,
    onOpenChange,
    rubric,
    tableMeta,
    hasNext,
    hasPrev,
    onNext,
    onPrev,
    viewMode = 'side-sheet',
}: ApplicantSheetProps) {
    const [activeField, setActiveField] = useState<string | null>(null)
    const [commentText, setCommentText] = useState("")
    const [showMentionDropdown, setShowMentionDropdown] = useState(false)
    const [mentionSearch, setMentionSearch] = useState("")
    const [cursorPosition, setCursorPosition] = useState(0)
    const [scoresRevealed, setScoresRevealed] = useState(false)
    const [logs, setLogs] = useState<any[]>([])
    const [loadingLogs, setLoadingLogs] = useState(false)
    const [localComments, setLocalComments] = useState<Record<string, Comment[]>>({})
    const inputRef = useRef<HTMLInputElement>(null)
    const commentsSectionRef = useRef<HTMLDivElement>(null)

    const fetchLogs = useCallback(async () => {
        if (!applicant?.id) return;
        setLoadingLogs(true);
        const { data, error } = await supabase
            .from('application_logs')
            .select('*')
            .eq('application_id', applicant.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setLogs(data);
        }
        setLoadingLogs(false);
    }, [applicant?.id]);

    // Sync state when applicant changes
    useEffect(() => {
        if (!applicant?.id) return

        setActiveField(null)
        setCommentText("")
        setShowMentionDropdown(false)
        setScoresRevealed(false)
        setLocalComments((applicant.comments || {}) as Record<string, Comment[]>)
        fetchLogs()

        // Real-time logs
        const logChannel = supabase
            .channel(`logs-${applicant.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'application_logs', filter: `application_id=eq.${applicant.id}` },
                () => fetchLogs()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(logChannel);
        };
    }, [applicant?.id, fetchLogs])

    useEffect(() => {
        setLocalComments((applicant?.comments || {}) as Record<string, Comment[]>)
    }, [applicant?.comments, applicant?.id])

    // Auto-scroll to comments when a field is selected
    useEffect(() => {
        if (activeField && commentsSectionRef.current) {
            commentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [activeField])

    if (!applicant) return null

    const name = applicant.applicantName || 'Anonymous'
    const reviewers: Reviewer[] = tableMeta?.reviewers || []
    const userProfile = tableMeta?.currentUserProfile
    const isBlindMode = tableMeta?.blindReview === true && !scoresRevealed

    const properties = [
        { id: "companyName", label: "Company", value: applicant.companyName },
        {
            id: "overallScore",
            label: "AI Score",
            value: applicant.overallScore === 0 ? "Not yet reviewed" : `${applicant.overallScore}/100`
        },
        ...rubric.map(c => ({
            id: c.id,
            label: c.name,
            value: applicant.scores?.[c.id] === undefined || applicant.scores?.[c.id] === 0
                ? "Not yet reviewed"
                : `${applicant.scores?.[c.id]}/100`
        })),
        { id: "status", label: "Status", value: applicant.status, isStatus: true },
        { id: "submittedDate", label: "Submitted", value: new Date(applicant.submittedDate).toLocaleDateString() },
    ]

    const handleSendComment = () => {
        if (!commentText.trim()) return
        const targetColumn = activeField || 'general'
        const optimisticComment: Comment = {
            id: `temp-${Date.now()}`,
            text: commentText,
            userId: userProfile?.id || 'current-user',
            createdAt: new Date().toISOString(),
            user: {
                name: userProfile?.full_name || userProfile?.name || 'You',
                avatarUrl: userProfile?.avatar_url || userProfile?.avatarUrl,
            }
        }

        setLocalComments((prev) => ({
            ...prev,
            [targetColumn]: [...(prev[targetColumn] || []), optimisticComment],
        }))

        if (tableMeta?.onComment) {
            tableMeta.onComment(applicant.id, commentText, targetColumn)
            setCommentText("")
            setShowMentionDropdown(false)
            setMentionSearch("")
        }
    }

    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newText = e.target.value
        const newCursorPos = e.target.selectionStart || 0
        setCommentText(newText)
        setCursorPosition(newCursorPos)
        const textBeforeCursor = newText.substring(0, newCursorPos)
        const lastAtIndex = textBeforeCursor.lastIndexOf('@')
        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
            const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' '
            if (charBeforeAt === ' ' || lastAtIndex === 0) {
                setMentionSearch(textAfterAt)
                setShowMentionDropdown(true)
                return
            }
        }
        setShowMentionDropdown(false)
        setMentionSearch("")
    }

    const handleMentionSelect = (reviewer: Reviewer) => {
        const textBeforeCursor = commentText.substring(0, cursorPosition)
        const lastAtIndex = textBeforeCursor.lastIndexOf('@')
        const beforeAt = commentText.substring(0, lastAtIndex)
        const afterCursor = commentText.substring(cursorPosition)
        const reviewerName = reviewer.full_name || (reviewer as any).name || "Unknown"
        const newText = `${beforeAt}@${reviewerName} ${afterCursor}`
        setCommentText(newText)
        setShowMentionDropdown(false)
        setMentionSearch("")
        setTimeout(() => {
            inputRef.current?.focus()
            const newCursorPos = beforeAt.length + reviewerName.length + 2
            inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
    }

    const handleAtIconClick = () => {
        const newText = commentText + '@'
        setCommentText(newText)
        setShowMentionDropdown(true)
        setMentionSearch("")
        setCursorPosition(newText.length)
        inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) {
            e.preventDefault()
            handleSendComment()
        }
    }

    const currentComments = localComments?.[activeField || 'general'] || []

    const InnerContent = (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            <div className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-blue-600 border-blue-100 hover:bg-blue-50 bg-blue-50/30 font-bold text-[11px] gap-1.5 transition-all active:scale-95"
                        onClick={() => tableMeta?.onBulkRunAIReview?.([applicant.id])}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Run AI Review
                    </Button>
                    <div className="flex items-center gap-1 border-l pl-2 border-gray-100">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                            onClick={onPrev}
                            disabled={!hasPrev}
                            title="Previous applicant"
                        >
                            <ChevronUp className="w-6 h-6" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                            onClick={onNext}
                            disabled={!hasNext}
                            title="Next applicant"
                        >
                            <ChevronDown className="w-6 h-6" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 sm:p-12 pb-0">
                    <div className="flex items-start gap-5 mb-8">
                        <div className="text-4xl font-bold text-gray-200 shrink-0 mt-3 leading-none select-none">
                            {name.charAt(0)}
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Applicant name</span>
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900">{name}</h1>
                        </div>
                    </div>

                    {/* HIGH-IMPACT METRICS HEADER */}
                    <div className="grid grid-cols-12 gap-4 mb-8">
                        {/* Overall Score Card */}
                        <div className="col-span-12 md:col-span-5 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Activity className="w-16 h-16 text-blue-600" />
                            </div>

                            {isBlindMode && (
                                <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center transition-all group-hover:bg-white/40">
                                    <Lock className="w-6 h-6 text-gray-400 mb-2" />
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Blind Review Active</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-full px-4 text-[11px] font-bold border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                        onClick={() => setScoresRevealed(true)}
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-2" />
                                        Reveal Scores
                                    </Button>
                                </div>
                            )}

                            <div className="relative mb-3">
                                {/* Simple CSS Ring */}
                                <div className="w-24 h-24 rounded-full border-4 border-gray-50 flex items-center justify-center relative">
                                    <div
                                        className={cn(
                                            "absolute inset-[-4px] rounded-full border-4 border-transparent transition-all duration-1000",
                                            isBlindMode ? "border-gray-200" :
                                                applicant.overallScore >= 76 ? "border-t-green-500 border-r-green-500" :
                                                    applicant.overallScore >= 51 ? "border-t-amber-500 border-r-amber-500" : "border-t-red-500 border-r-red-500"
                                        )}
                                        style={{ transform: `rotate(${isBlindMode ? 0 : (applicant.overallScore / 100) * 360}deg)` }}
                                    />
                                    <div className="text-center">
                                        <div className={cn("text-3xl font-black tracking-tighter",
                                            isBlindMode ? "text-gray-300" :
                                                applicant.overallScore >= 76 ? "text-green-600" :
                                                    applicant.overallScore >= 51 ? "text-amber-600" : "text-red-600"
                                        )}>
                                            {isBlindMode ? "--" : applicant.overallScore}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Score</div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center">
                                <h3 className="text-sm font-bold text-gray-900 mb-1">AI Recommendation</h3>
                                <Badge className={cn("rounded-full px-3 py-0.5 border-0 font-bold text-[10px] uppercase tracking-widest", isBlindMode ? "bg-gray-100 text-gray-400" : getScoreColor(applicant.overallScore))}>
                                    {isBlindMode ? "Hidden" : applicant.overallScore >= 76 ? "Strong Fit" : applicant.overallScore >= 51 ? "Potential Match" : "Low Alignment"}
                                </Badge>
                            </div>
                        </div>

                        {/* Rubric Breakdown Grid */}
                        <div className="col-span-12 md:col-span-7 grid grid-cols-2 gap-3">
                            {rubric.map((c) => {
                                const score = applicant.scores?.[c.id] || 0;
                                const isActive = activeField === c.id;
                                const commentCount = localComments?.[c.id]?.length || 0;

                                return (
                                    <div
                                        key={c.id}
                                        className={cn(
                                            "rounded-xl p-3 border transition-all cursor-pointer group/card relative",
                                            isActive
                                                ? "bg-blue-50/50 border-blue-200 shadow-sm"
                                                : "bg-gray-50/50 border-gray-100/50 hover:border-gray-200"
                                        )}
                                        onClick={() => setActiveField(isActive ? null : c.id)}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className={cn(
                                                    "text-[11px] font-bold uppercase tracking-tight truncate",
                                                    isActive ? "text-blue-600" : "text-gray-500"
                                                )}>
                                                    {c.name}
                                                </span>
                                                {commentCount > 0 && (
                                                    <div className="flex items-center gap-0.5 text-blue-500">
                                                        <MessageSquare className="w-2.5 h-2.5 fill-current" />
                                                        <span className="text-[10px] font-bold">{commentCount}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <span className={cn("text-xs font-black",
                                                score >= 76 ? "text-green-600" : score >= 51 ? "text-amber-600" : "text-red-600"
                                            )}>
                                                {isBlindMode ? "--" : score}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-200/50 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-700",
                                                    score >= 76 ? "bg-green-500" : score >= 51 ? "bg-amber-500" : "bg-red-500"
                                                )}
                                                style={{ width: isBlindMode ? '0%' : `${score}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Status Card (Always present) */}
                            <div
                                className={cn(
                                    "col-span-2 rounded-xl p-3 flex items-center justify-between border transition-all cursor-pointer",
                                    activeField === 'status'
                                        ? "bg-blue-100/50 border-blue-300"
                                        : "bg-blue-50/30 border-blue-100/50"
                                )}
                                onClick={() => setActiveField(activeField === 'status' ? null : 'status')}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                        {getStatusIcon(applicant.status)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Current Status</div>
                                            {(localComments?.['status']?.length || 0) > 0 && (
                                                <div className="flex items-center gap-0.5 text-blue-500">
                                                    <MessageSquare className="w-2.5 h-2.5 fill-current" />
                                                    <span className="text-[10px] font-bold">{localComments?.['status']?.length}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-sm font-bold text-blue-900">{applicant.status}</div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-blue-600 hover:bg-blue-100 hover:text-blue-700">
                                            Change Status
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                        {["New", "Reviewing", "Shortlist", "Interview", "Accepted", "Rejected"].map((s) => (
                                            <DropdownMenuItem
                                                key={s}
                                                className="flex items-center gap-2 cursor-pointer"
                                                onClick={() => tableMeta?.onStatusChange?.(applicant.id, s)}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", getStatusDotColor(s))} />
                                                {s}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>

                    {/* APPLICANT KEY DETAILS */}
                    <div className="grid grid-cols-2 gap-6 px-1 mb-12 py-6 border-y border-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-sm">
                                <Building2 className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-tight mb-1">Company</span>
                                <span className="text-sm font-bold text-gray-900 leading-tight">{applicant.companyName}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-tight mb-1">Submitted</span>
                                <span className="text-sm font-bold text-gray-700 leading-tight">{new Date(applicant.submittedDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights Section */}
                    {applicant.aiExplanation && (
                        <div className="mb-12 p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Sparkles className="w-12 h-12 text-blue-600" />
                            </div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="text-sm font-bold text-blue-900 tracking-tight">AI Reasoning Summary</h3>
                                </div>
                                {isBlindMode && (
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-blue-200 text-blue-600 bg-white">
                                        Blind Mode Active
                                    </Badge>
                                )}
                            </div>
                            {isBlindMode ? (
                                <div className="relative">
                                    <p className="text-sm text-blue-800/20 leading-relaxed font-medium blur-sm select-none">
                                        {applicant.aiExplanation}
                                    </p>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                        <div className="p-2 bg-white rounded-full shadow-sm border border-blue-100">
                                            <Lock className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <button
                                            onClick={() => setScoresRevealed(true)}
                                            className="text-[11px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest"
                                        >
                                            Click to reveal evaluation
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-blue-800/80 leading-relaxed font-medium">
                                    {applicant.aiExplanation}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Media Submissions Section */}
                {(() => {
                    const formFields = tableMeta?.formFields || [];
                    const allQuestions = formFields.flatMap((s: any) => s.questions || []);
                    const mediaQuestions = allQuestions.filter((q: any) =>
                        ['file-upload', 'video-pitch', 'image-upload'].includes(q.type)
                    );
                    const mediaSubmissions = mediaQuestions.map((q: any) => ({
                        ...q,
                        answer: applicant.answers?.[q.id]
                    })).filter((m: any) => m.answer);

                    if (mediaSubmissions.length === 0) return null;

                    return (
                        <div className="px-8 sm:px-12 py-8 border-t border-gray-100 bg-white">
                            <h3 className="text-sm font-semibold text-gray-400 mb-6 flex items-center gap-2 uppercase tracking-tight">
                                Submitted Media
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {mediaSubmissions.map((media: any) => (
                                    <div key={media.id} className="group relative bg-gray-50 rounded-xl overflow-hidden border border-gray-100 transition-all hover:border-blue-200 hover:shadow-sm">
                                        {media.type === 'image-upload' ? (
                                            <div className="aspect-video relative overflow-hidden bg-gray-100">
                                                <img
                                                    src={media.answer}
                                                    alt={media.text}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <Button variant="secondary" size="sm" className="h-8 gap-1.5" onClick={() => window.open(media.answer, '_blank')}>
                                                        <Maximize2 className="w-3.5 h-3.5" />
                                                        View
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : media.type === 'video-pitch' ? (
                                            <div className="aspect-video relative flex flex-col items-center justify-center bg-gray-900 overflow-hidden">
                                                {(typeof media.answer === 'string' && (media.answer.includes('youtube.com') || media.answer.includes('youtu.be') || media.answer.includes('vimeo.com'))) ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                                        <Video className="w-8 h-8 text-white/50" />
                                                        <Button variant="secondary" size="sm" className="h-8 gap-1.5" onClick={() => window.open(media.answer, '_blank')}>
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            Watch Original
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <video
                                                        src={media.answer}
                                                        className="w-full h-full object-cover"
                                                        controls
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-4 flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                    <FileText className="w-6 h-6 text-blue-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{media.text}</p>
                                                    <p className="text-[11px] text-gray-500">File Attachment</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                    onClick={() => window.open(media.answer, '_blank')}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                <Separator className="my-1 bg-gray-100" />

                <div ref={commentsSectionRef} className="bg-gray-50/50 min-h-[400px]">
                    <div className="sticky top-0 z-20 bg-gray-50/50 p-8 sm:p-12 pt-8 pb-4 border-b border-gray-100/50">
                        <h3 className="text-sm font-semibold text-gray-400 mb-6 flex items-center gap-2 uppercase tracking-tight">
                            Comments
                            {activeField && (
                                <div className="flex items-center gap-2 ml-2 lowercase font-bold">
                                    <span className="text-blue-500 tracking-tight flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        on {properties.find(p => p.id === activeField)?.label || activeField}
                                        <button
                                            onClick={() => setActiveField(null)}
                                            className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                                            title="Return to general comments"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                </div>
                            )}
                        </h3>

                        <div className="flex gap-4 items-center">
                            <Avatar className="w-8 h-8 border border-gray-100 shadow-sm">
                                <AvatarImage src={userProfile?.avatar_url || userProfile?.avatarUrl} />
                                <AvatarFallback className="bg-white text-[10px] text-gray-400">
                                    {userProfile?.full_name?.charAt(0) || userProfile?.name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 flex items-center gap-1 transition-all group relative">
                                <MentionDropdown
                                    reviewers={reviewers}
                                    isOpen={showMentionDropdown}
                                    onSelect={handleMentionSelect}
                                    onClose={() => setShowMentionDropdown(false)}
                                    searchText={mentionSearch}
                                />
                                <Input
                                    ref={inputRef}
                                    placeholder="Add a comment..."
                                    value={commentText}
                                    onChange={handleCommentChange}
                                    onKeyDown={handleKeyDown}
                                    className="border-none bg-transparent shadow-none px-3 focus-visible:ring-0 text-gray-600 placeholder:text-gray-300 text-sm h-8"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-300 hover:text-gray-400 hover:bg-transparent"
                                        onClick={handleAtIconClick}
                                        type="button"
                                    >
                                        <AtSign className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        className={cn(
                                            "h-7 w-7 rounded-full transition-all duration-300",
                                            commentText.trim()
                                                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:scale-105"
                                                : "bg-gray-100 text-gray-300 cursor-not-allowed"
                                        )}
                                        onClick={handleSendComment}
                                        disabled={!commentText.trim()}
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 sm:p-12 pt-4">
                        <div className="space-y-6">
                            {currentComments.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    No comments yet. Be the first to add one!
                                </div>
                            ) : (
                                currentComments.map((comment: Comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={comment.user?.avatarUrl} />
                                            <AvatarFallback>{comment.user?.name?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">{comment.user?.name || 'Unknown User'}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                        onClick={() => {
                                                            setLocalComments((prev) => ({
                                                                ...prev,
                                                                [activeField || 'general']: (prev[activeField || 'general'] || []).filter((existing) => existing.id !== comment.id)
                                                            }))
                                                            tableMeta?.onDeleteComment?.(comment.id)
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600 leading-relaxed">
                                                {(() => {
                                                    const text = comment.text;
                                                    const reviewerNames = reviewers.map(r => r.full_name || (r as any).name).filter(Boolean);
                                                    if (reviewerNames.length === 0) return text;
                                                    const sortedNames = [...reviewerNames].sort((a, b) => b.length - a.length);
                                                    const pattern = sortedNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                                                    const mentionRegex = new RegExp(`(@(?:${pattern}))`, 'g');
                                                    const parts = text.split(mentionRegex);
                                                    return parts.map((part, i) => {
                                                        if (part.startsWith('@')) {
                                                            const name = part.substring(1);
                                                            if (reviewerNames.includes(name)) {
                                                                return <span key={i} className="text-blue-600">{part}</span>;
                                                            }
                                                        }
                                                        return part;
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    if (viewMode === 'center-sheet') {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent
                    className="sm:max-w-[70vw] h-[90vh] p-0 overflow-hidden flex flex-col rounded-xl border border-gray-100 shadow-2xl"
                    wrapperClassName="p-0 h-full flex flex-col"
                >
                    <DialogTitle className="sr-only">Applicant Details</DialogTitle>
                    {InnerContent}
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[50vw] p-0 border-l border-gray-200 overflow-hidden flex flex-col">
                <SheetTitle className="sr-only">Applicant Details</SheetTitle>
                {InnerContent}
            </SheetContent>
        </Sheet>
    )
}
