'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { usePathname } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, CheckCircle, Target, Users, AlertCircle,
    MessageSquare, Building2, Calendar, FileText, Video, ExternalLink,
    Download, Maximize2, X, Lock, Eye, ArrowLeft, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Application, Comment, getScoreColor, getStatusIcon, getStatusDotColor } from '../../dashboard/components/columns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { MentionDropdown, Reviewer } from '@/components/ui/mention-dropdown';
import Link from 'next/link';
import { buildUserDisplay, getDisplayName } from '@/lib/user-display';

export default function ReviewPortal({ params }: { params: Promise<{ programId: string }> }) {
    const resolvedParams = use(params);
    const programId = resolvedParams.programId;
    const [data, setData] = useState<Application[]>([]);
    const [program, setProgram] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

    // Review State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearch, setMentionSearch] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const commentsSectionRef = useRef<HTMLDivElement>(null);

    // Hardcode Blind Mode for Review Portal to prevent bias
    const isBlindMode = true;

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                const mergedProfile = {
                    ...profile,
                    full_name: getDisplayName(profile?.full_name, profile?.email || user.email),
                    email: profile?.email || user.email,
                    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url
                };

                if (profile && (
                    profile.full_name !== mergedProfile.full_name ||
                    profile.email !== mergedProfile.email ||
                    profile.avatar_url !== mergedProfile.avatar_url
                )) {
                    await supabase
                        .from('profiles')
                        .update({
                            full_name: mergedProfile.full_name,
                            email: mergedProfile.email,
                            avatar_url: mergedProfile.avatar_url
                        })
                        .eq('id', user.id);
                }

                setCurrentUserProfile(profile ? mergedProfile : {
                    full_name: getDisplayName(user.user_metadata?.full_name, user.email),
                    email: user.email,
                    avatar_url: user.user_metadata?.avatar_url
                });
            }
        };
        checkUser();
    }, []);

    const fetchData = useCallback(async () => {
        if (!programId) return;
        try {
            // Fetch Program details
            const { data: progData, error: progError } = await supabase
                .from('programs')
                .select('*')
                .eq('id', programId)
                .maybeSingle();

            if (progError) throw progError;
            if (!progData) {
                setLoading(false);
                return;
            }

            // Fetch Rubric
            const { data: rubricData } = await supabase
                .from('rubrics')
                .select('*')
                .eq('program_id', programId);

            // Fetch Form Structure
            const { data: formData } = await supabase
                .from('forms')
                .select('fields')
                .eq('program_id', programId)
                .maybeSingle();

            // Fetch Reviewers for @mentions
            const { data: reviewersData } = await supabase
                .from('program_reviewers')
                .select(`user_id, profiles:user_id ( full_name, email, avatar_url )`)
                .eq('program_id', programId);

            setProgram({
                ...progData,
                rubric: rubricData || [],
                formFields: formData?.fields || [],
                reviewers: (reviewersData || []).map(r => {
                    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                    return {
                        id: r.user_id,
                        full_name: profile?.full_name,
                        email: profile?.email,
                        avatar_url: profile?.avatar_url
                    };
                })
            });

            // Fetch Applications
            const { data: appsData, error: appsError } = await supabase
                .from('applications')
                .select('*')
                .eq('program_id', programId)
                .order('submitted_at', { ascending: false });

            if (appsError) throw appsError;

            // Fetch Comments
            let commentsData: any[] = [];
            if (appsData && appsData.length > 0) {
                const { data: fetchedComments } = await supabase
                    .from('comments')
                    .select(`id, application_id, text, user_id, column_id, created_at, user:profiles!user_id ( full_name, email, avatar_url )`)
                    .in('application_id', appsData.map(a => a.id));
                commentsData = fetchedComments || [];
            }

            const mappedApps: Application[] = (appsData || []).map(app => {
                const scoreEntries = Object.entries(app.scores || {});
                const mappedScores: any = {};
                scoreEntries.forEach(([key, value]: [string, any]) => {
                    mappedScores[key] = typeof value === 'object' ? value.score : value;
                });

                const appComments: Record<string, any[]> = {};
                (commentsData || []).filter(c => c.application_id === app.id).forEach(c => {
                    const colId = c.column_id || 'general';
                    if (!appComments[colId]) appComments[colId] = [];
                    appComments[colId].push({
                        id: c.id,
                        text: c.text,
                        userId: c.user_id,
                        createdAt: c.created_at,
                        user: buildUserDisplay({
                            fullName: (c.user as any)?.full_name,
                            email: (c.user as any)?.email,
                            avatarUrl: (c.user as any)?.avatar_url
                        })
                    });
                });

                const rawOverall = app.overall_ai_score ?? app.overall_score ?? 0;
                return {
                    id: app.id,
                    applicantName: app.applicant_name || app.full_name || 'Anonymous',
                    companyName: app.company_name || 'N/A',
                    overallScore: typeof rawOverall === 'string' ? parseFloat(rawOverall) : rawOverall,
                    status: app.status ? (app.status.charAt(0).toUpperCase() + app.status.slice(1)) : 'New',
                    submittedDate: app.submitted_at || app.created_at || new Date().toISOString(),
                    scores: mappedScores,
                    comments: appComments,
                    answers: app.answers,
                    aiExplanation: app.ai_explanation
                } as Application;
            });

            setData(mappedApps);
        } catch (error: any) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load applicants.");
        } finally {
            setLoading(false);
        }
    }, [programId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle Active Field changes
    useEffect(() => {
        if (activeField && commentsSectionRef.current) {
            commentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [activeField]);

    // Handlers
    const handleScoreChange = async (appId: string, rubricId: string, newScore: number) => {
        const app = data.find(a => a.id === appId);
        if (!app) return;

        const currentScores = app.scores || {};
        const updatedScores = { ...currentScores, [rubricId]: newScore };

        // Optimistic UI
        setData(prev => prev.map(a => a.id === appId ? { ...a, scores: updatedScores } : a));

        try {
            await supabase
                .from('applications')
                .update({ scores: updatedScores })
                .eq('id', appId);

            // Log score change
            const criterionName = program?.rubric.find((r: any) => r.id === rubricId)?.name || rubricId;
            await supabase.from('application_logs').insert({
                application_id: appId,
                program_id: programId,
                event_type: 'score_update',
                message: `Updated score for ${criterionName} to ${newScore}`,
                details: { criterion: rubricId, score: newScore, user: user?.id }
            });
        } catch (error: any) {
            toast.error("Failed to update score");
            fetchData(); // revert
        }
    };

    const handleComment = async () => {
        if (!commentText.trim()) return;
        const applicant = data[currentIndex];
        if (!applicant || !user) return;

        const colId = activeField || 'general';
        const newCommentObj: Comment = {
            id: 'temp-' + Date.now(),
            text: commentText,
            userId: user.id,
            createdAt: new Date().toISOString(),
            user: buildUserDisplay({
                fullName: currentUserProfile?.full_name,
                email: currentUserProfile?.email || user.email,
                avatarUrl: currentUserProfile?.avatar_url
            })
        };

        // Optimistic update
        setData(prev => prev.map(a => {
            if (a.id !== applicant.id) return a;
            const existingComments: Comment[] = a.comments?.[colId] || [];
            return {
                ...a,
                comments: {
                    ...(a.comments || {}),
                    [colId]: [...existingComments, newCommentObj] as Comment[]
                }
            };
        }));

        setCommentText("");
        setShowMentionDropdown(false);

        try {
            const { error: commentError } = await supabase.from('comments').insert({
                application_id: applicant.id,
                user_id: user.id,
                text: commentText,
                column_id: colId === 'general' ? null : colId
            });

            if (commentError) throw commentError;

            // Log the comment
            const criterionName = program?.rubric.find((r: any) => r.id === colId)?.name || (colId === 'general' ? 'General' : colId);
            await supabase.from('application_logs').insert({
                application_id: applicant.id,
                program_id: programId,
                event_type: 'comment',
                message: `Added a comment on ${criterionName}`,
                details: { columnId: colId, text: commentText, user: user.id }
            });

            // Re-fetch to ensure everything is in sync (IDs, etc.)
            fetchData();
        } catch (error: any) {
            console.error("Error adding comment:", error);
            toast.error("Failed to add comment");
            fetchData(); // Revert optimistic update
        }
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newText = e.target.value;
        const newCursorPos = e.target.selectionStart || 0;
        setCommentText(newText);
        setCursorPosition(newCursorPos);

        const textBeforeCursor = newText.substring(0, newCursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
            if (charBeforeAt === ' ' || lastAtIndex === 0) {
                setMentionSearch(textAfterAt);
                setShowMentionDropdown(true);
                return;
            }
        }
        setShowMentionDropdown(false);
    };

    const applicant = data[currentIndex];

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
    }

    if (!applicant) {
        return <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
            <Target className="w-12 h-12 text-gray-300" />
            <h2 className="text-xl font-bold text-gray-700">No applicants found</h2>
            <Link href={`/dashboard?id=${programId}`}><Button variant="outline">Back to Dashboard</Button></Link>
        </div>;
    }

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 bg-white">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard?id=${programId}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-2 text-gray-500 hover:text-gray-900">
                            <ArrowLeft className="w-4 h-4" />
                            Exit Review Mode
                        </Button>
                    </Link>
                    <div className="h-4 w-[1px] bg-gray-200" />
                    <span className="font-bold text-gray-900">{program?.name}</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5 text-emerald-600/80 select-none">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Auto-saved</span>
                    </div>
                    <Badge variant="outline" className="bg-gray-50 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                        Applicant {currentIndex + 1} of {data.length}
                    </Badge>
                </div>
            </div>

            {/* Split Pane */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane - Applicant Data */}
                <div className="w-1/2 border-r border-gray-200 overflow-y-auto bg-white hide-scrollbar pb-24">
                    {/* Header */}
                    <div className="flex items-center gap-4 px-8 pt-10 pb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0">
                            {applicant.applicantName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Applicant name</span>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{applicant.applicantName}</h1>
                        </div>
                    </div>

                    {/* Key Details */}
                    <div className="grid grid-cols-2 gap-4 px-8 mb-8">
                        <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                            <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-sm">
                                <Building2 className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-tight">Company</span>
                                <span className="text-sm font-bold text-gray-900">{applicant.companyName}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                            <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-tight">Submitted</span>
                                <span className="text-sm font-bold text-gray-700">{new Date(applicant.submittedDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Form Answers */}
                    <div className="px-8 pb-12">
                        {(() => {
                            const formFields = program?.formFields || [];
                            const allQuestions = formFields.flatMap((s: any) => s.questions || []);
                            const textQuestions = allQuestions.filter((q: any) => !['file-upload', 'video-pitch', 'image-upload'].includes(q.type));

                            if (textQuestions.length === 0) return null;

                            return (
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Application Form</h3>
                                    <div className="space-y-6">
                                        {textQuestions.map((q: any) => (
                                            <div key={q.id} className="group">
                                                <h4 className="text-sm font-bold text-gray-900 mb-1.5 leading-snug">{q.question}</h4>
                                                <div className="text-sm text-gray-600 leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-100/50">
                                                    {applicant.answers?.[q.id] || <span className="text-gray-300 italic">No answer provided</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Right Pane - Evaluation */}
                <div className="w-1/2 bg-gray-50/30 overflow-y-auto hide-scrollbar flex flex-col pb-24">
                    <div className="p-8">
                        {/* Blind Mode Notice */}
                        <div className="mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
                            <Lock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-blue-900">Blind Review Enforced</h4>
                                <p className="text-xs text-blue-700/80 leading-relaxed mt-1">
                                    To prevent anchoring bias, AI recommendations and other reviewers' comments are hidden. Focus entirely on your independent evaluation.
                                </p>
                            </div>
                        </div>

                        {/* Rubric */}
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Evaluation Rubric</h3>
                        <div className="space-y-3 mb-8">
                            {program?.rubric.map((c: any) => {
                                const score = applicant.scores?.[c.id] || 0;
                                const isActive = activeField === c.id;
                                const commentCount = applicant.comments?.[c.id]?.length || 0;

                                return (
                                    <div
                                        key={c.id}
                                        className={cn(
                                            "rounded-xl p-4 border transition-all bg-white shadow-sm cursor-pointer",
                                            isActive ? "ring-2 ring-blue-500 border-transparent" : "border-gray-200 hover:border-gray-300"
                                        )}
                                        onClick={() => setActiveField(isActive ? null : c.id)}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900">{c.name}</span>
                                                {commentCount > 0 && (
                                                    <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100">
                                                        <MessageSquare className="w-3 h-3 mr-1" /> {commentCount}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className={cn("text-lg font-black", getScoreColor(score))}>
                                                {score}/100
                                            </span>
                                        </div>

                                        {/* Simplified Slider */}
                                        <input
                                            type="range"
                                            min="0" max="100"
                                            value={score}
                                            onChange={(e) => handleScoreChange(applicant.id, c.id, parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            onClick={(e) => e.stopPropagation()} // Prevent card click when sliding
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Comments Section */}
                        <div ref={commentsSectionRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 min-h-[300px]">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4 flex items-center justify-between">
                                <span>Comments {activeField && <span className="text-blue-500 ml-1">on {program?.rubric.find((r: any) => r.id === activeField)?.name || activeField}</span>}</span>
                                {activeField && (
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-gray-400" onClick={() => setActiveField(null)}>
                                        Clear Filter <X className="w-3 h-3 ml-1" />
                                    </Button>
                                )}
                            </h3>

                            {/* Comment List */}
                            <div className="space-y-4 mb-4 min-h-[100px]">
                                {(applicant.comments?.[activeField || 'general'] || []).map((comment: any) => (
                                    <div key={comment.id} className="flex gap-3 group">
                                        <Avatar className="w-8 h-8 shrink-0 border border-gray-100">
                                            <AvatarImage src={comment.user?.avatarUrl} />
                                            <AvatarFallback className="bg-blue-50 text-blue-600 text-[10px] font-bold">
                                                {comment.user?.name?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-none p-3 border border-gray-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-gray-900">{comment.user?.name || 'Reviewer'}</span>
                                            </div>
                                            <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                                        </div>
                                    </div>
                                ))}
                                {(applicant.comments?.[activeField || 'general'] || []).length === 0 && (
                                    <div className="text-center py-8 text-sm text-gray-400 italic">No comments yet.</div>
                                )}
                            </div>

                            {/* Comment Input */}
                            <div className="relative">
                                <MentionDropdown
                                    reviewers={program?.reviewers || []}
                                    isOpen={showMentionDropdown}
                                    onSelect={(reviewer) => {
                                        const textBeforeCursor = commentText.substring(0, cursorPosition);
                                        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                                        const beforeAt = commentText.substring(0, lastAtIndex);
                                        const newText = `${beforeAt}@${reviewer.full_name || 'Reviewer'} ${commentText.substring(cursorPosition)}`;
                                        setCommentText(newText);
                                        setShowMentionDropdown(false);
                                    }}
                                    onClose={() => setShowMentionDropdown(false)}
                                    searchText={mentionSearch}
                                />
                                <div className="flex gap-2">
                                    <Input
                                        ref={inputRef}
                                        value={commentText}
                                        onChange={handleCommentChange}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !showMentionDropdown && handleComment()}
                                        placeholder={`Add a comment${activeField ? ' about ' + (program?.rubric.find((r: any) => r.id === activeField)?.name || activeField) : ''}... (use @ to mention)`}
                                        className="bg-gray-50 border-transparent focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:bg-white"
                                    />
                                    <Button onClick={handleComment} disabled={!commentText.trim()} className="bg-blue-600 hover:bg-blue-700">
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-between px-8 z-50">
                <Button
                    variant="outline"
                    onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setActiveField(null); }}
                    disabled={currentIndex === 0}
                    className="gap-2"
                >
                    <ChevronLeft className="w-4 h-4" /> Previous
                </Button>

                <div className="flex gap-1">
                    {data.map((_, idx) => (
                        <div key={idx} className={cn("w-2 h-2 rounded-full", idx === currentIndex ? "bg-blue-600" : "bg-gray-200")} />
                    ))}
                </div>

                <Button
                    variant="default"
                    onClick={() => { setCurrentIndex(Math.min(data.length - 1, currentIndex + 1)); setActiveField(null); }}
                    disabled={currentIndex === data.length - 1}
                    className="gap-2 bg-gray-900 hover:bg-gray-800 text-white"
                >
                    Next Applicant <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
