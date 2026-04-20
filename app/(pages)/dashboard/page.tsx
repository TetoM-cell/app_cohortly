'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { Plus, Rocket, Loader2, UsersRound } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { exportApplicationsToCSV } from '@/lib/export';
import { buildUserDisplay, getDisplayName } from '@/lib/user-display';

interface SavedView {
    id: string;
    name: string;
    filters: string[];
    tags: string[];
    reviewers: string[];
    scoreRange: number[];
}

import { DataTable } from "./components/data-table";
import { Application } from "./components/columns";
import { DashboardHeader } from "./components/dashboard-header";
import { CohortSettingsSheet } from "./components/cohort-settings-sheet";
import { SpotlightTour } from "@/components/SpotlightTour";
import { TableSkeleton } from "./components/table-skeleton";
import { ImportApplicantsModal } from "./components/import-applicants-modal";

const mockProgram = {
    id: "",
    name: "Select a cohort",
    rubric: [],
    reviewers: []
};

import { Suspense } from 'react';

const DEFAULT_PAGE_SIZE = 50;

function isDateRangeFilter(value: unknown): value is { from?: Date; to?: Date } {
    return typeof value === 'object' && value !== null && ('from' in value || 'to' in value);
}

function DashboardContent() {
    const searchParams = useSearchParams();
    const programId = searchParams.get('id');
    const [data, setData] = useState<Application[]>([]);
    const [program, setProgram] = useState<any>(mockProgram);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isScoring, setIsScoring] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<10 | 25 | 50 | 100>(DEFAULT_PAGE_SIZE);
    const [totalApplicationsCount, setTotalApplicationsCount] = useState(0);
    const [queryState, setQueryState] = useState<{ sorting: SortingState; columnFilters: ColumnFiltersState }>({
        sorting: [],
        columnFilters: [],
    });
    const cancelScoringRef = useRef(false);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

                if (profile) {
                    setCurrentUserProfile(mergedProfile);
                } else {
                    setCurrentUserProfile({
                        full_name: getDisplayName(user.user_metadata?.full_name, user.email),
                        email: user.email,
                        avatar_url: user.user_metadata?.avatar_url
                    });
                }
            }
        };
        checkUser();
    }, []);

    const fetchData = useCallback(async () => {
        if (!programId) return;
        setLoading(true);
        try {
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;
            const { data: progData, error: progError } = await supabase
                .from('programs')
                .select('*')
                .eq('id', programId)
                .maybeSingle();

            if (progError) throw new Error(`Failed to fetch program: ${progError.message}`);

            if (!progData) {
                setLoading(false);
                setProgram(mockProgram);
                return;
            }

            const [
                { data: rubricData, error: rubricError },
                { data: reviewersData, error: reviewersError },
                { data: thresholdData, error: thresholdError },
                { data: formData, error: formError },
                { data: appsData, error: appsError, count: appsCount },
            ] = await Promise.all([
                supabase
                    .from('rubrics')
                    .select('*')
                    .eq('program_id', programId),
                supabase
                    .from('program_reviewers')
                    .select(`
                        user_id,
                        profiles:user_id ( full_name, email, avatar_url )
                    `)
                    .eq('program_id', programId),
                supabase
                    .from('threshold_rules')
                    .select('*')
                    .eq('program_id', programId),
                supabase
                    .from('forms')
                    .select('fields')
                    .eq('program_id', programId)
                    .maybeSingle(),
                (() => {
                    let appsQuery = supabase
                        .from('applications')
                        .select('*', { count: 'exact' })
                        .eq('program_id', programId);

                    queryState.columnFilters.forEach((filter) => {
                        if (filter.id === 'applicantName' && typeof filter.value === 'string' && filter.value.trim()) {
                            appsQuery = appsQuery.ilike('applicant_name', `%${filter.value.trim()}%`);
                        }

                        if (filter.id === 'companyName' && Array.isArray(filter.value) && filter.value.length > 0) {
                            appsQuery = appsQuery.in('company_name', filter.value);
                        }

                        if (filter.id === 'status' && Array.isArray(filter.value) && filter.value.length > 0) {
                            appsQuery = appsQuery.in('status', filter.value.map((status) => String(status).toLowerCase()));
                        }

                        if (filter.id === 'overallScore' && Array.isArray(filter.value) && filter.value.length === 2) {
                            appsQuery = appsQuery
                                .gte('overall_ai_score', Number(filter.value[0]))
                                .lte('overall_ai_score', Number(filter.value[1]));
                        }

                        if (filter.id === 'submittedDate' && isDateRangeFilter(filter.value)) {
                            if (filter.value.from) {
                                appsQuery = appsQuery.gte('submitted_at', filter.value.from.toISOString());
                            }
                            if (filter.value.to) {
                                const inclusiveEnd = new Date(filter.value.to);
                                inclusiveEnd.setHours(23, 59, 59, 999);
                                appsQuery = appsQuery.lte('submitted_at', inclusiveEnd.toISOString());
                            }
                        }
                    });

                    const primarySort = queryState.sorting[0];
                    const sortableColumnMap: Record<string, string> = {
                        applicantName: 'applicant_name',
                        companyName: 'company_name',
                        overallScore: 'overall_ai_score',
                        status: 'status',
                        submittedDate: 'submitted_at',
                    };

                    const sortColumn = primarySort ? sortableColumnMap[primarySort.id] : undefined;

                    if (sortColumn) {
                        appsQuery = appsQuery.order(sortColumn, { ascending: !primarySort.desc });
                    } else {
                        appsQuery = appsQuery.order('submitted_at', { ascending: false });
                    }

                    return appsQuery.range(from, to);
                })(),
            ]);

            if (rubricError) throw new Error(`Failed to fetch rubrics: ${rubricError.message}`);
            if (reviewersError) throw new Error(`Failed to fetch reviewers: ${reviewersError.message}`);
            if (thresholdError) throw new Error(`Failed to fetch threshold rules: ${thresholdError.message}`);

            if (formError) console.error('Error fetching form:', formError);

            if (appsError) throw new Error(`Failed to fetch applications: ${appsError.message}`);
            setTotalApplicationsCount(appsCount ?? 0);

            let commentPresenceData: { application_id: string }[] = [];
            if (appsData && appsData.length > 0) {
                const { data: fetchedCommentPresence, error: commentsError } = await supabase
                    .from('comments')
                    .select('application_id')
                    .in('application_id', appsData.map(a => a.id));

                if (commentsError) throw new Error(`Failed to fetch comments: ${commentsError.message}`);
                commentPresenceData = fetchedCommentPresence || [];
            }

            const commentedApplicationIds = new Set(
                commentPresenceData.map((comment) => comment.application_id)
            );

            setProgram({
                ...progData,
                rubric: rubricData || [],
                threshold_rules: thresholdData || [],
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

            const mappedApps: Application[] = (appsData || []).map(app => {
                // Map score objects
                const scoreEntries = Object.entries(app.scores || {});
                const mappedScores: any = {};
                scoreEntries.forEach(([key, value]: [string, any]) => {
                    const rawScore = typeof value === 'object' ? value.score : value;
                    mappedScores[key] = typeof rawScore === 'string' ? parseFloat(rawScore) : rawScore;
                });

                // Get overall score safely
                const rawOverall = app.overall_ai_score ?? app.overall_score ?? 0;
                const overallScoreNum = typeof rawOverall === 'string' ? parseFloat(rawOverall) : (rawOverall || 0);

                return {
                    id: app.id,
                    applicantName: app.applicant_name || app.full_name || 'Anonymous',
                    companyName: app.company_name || 'N/A',
                    overallScore: overallScoreNum,
                    status: app.status ? (app.status.charAt(0).toUpperCase() + app.status.slice(1)) : 'New',
                    submittedDate: app.submitted_at || app.created_at || new Date().toISOString(),
                    scores: mappedScores,
                    hasComment: commentedApplicationIds.has(app.id),
                    answers: app.answers,
                    aiExplanation: app.ai_explanation
                } as Application;
            });

            setData(mappedApps);

            // --- AUTOMATION ENGINE ---
            // Only run if we have rules and apps in 'Scored' status
            const scoredApps = mappedApps.filter(app => app.status?.toLowerCase() === 'scored');
            const rules = thresholdData || [];

            if (scoredApps.length > 0 && rules.length > 0) {
                console.log(`[Automation] Processing ${scoredApps.length} scored applications...`);
                
                const updates = scoredApps.map(app => {
                    let newStatus = null;
                    
                    // Evaluate rules (priority: shortlist > reject)
                    const shortlistRule = rules.find(r => r.action === 'shortlist');
                    const rejectRule = rules.find(r => r.action === 'reject');

                    if (shortlistRule && app.overallScore >= shortlistRule.value) {
                        newStatus = 'shortlist';
                    } else if (rejectRule && app.overallScore < rejectRule.value) {
                        newStatus = 'rejected';
                    }

                    if (newStatus) {
                        return { id: app.id, status: newStatus };
                    }
                    return null;
                }).filter(u => u !== null);

                if (updates.length > 0) {
                    console.log(`[Automation] Applying auto-status for ${updates.length} apps...`);
                    
                    // Group by status for bulk updates
                    const byStatus: Record<string, string[]> = {};
                    updates.forEach(u => {
                        if (!byStatus[u.status]) byStatus[u.status] = [];
                        byStatus[u.status].push(u.id);
                    });

                    for (const [status, ids] of Object.entries(byStatus)) {
                        await supabase
                            .from('applications')
                            .update({ status: status })
                            .in('id', ids);

                        // Log each automation event
                        const logEntries = ids.map(id => ({
                            application_id: id,
                            program_id: programId,
                            event_type: 'status_change',
                            message: `Auto-${status} via Threshold Rules`,
                            details: { to: status, automation: true }
                        }));
                        await supabase.from('application_logs').insert(logEntries);
                    }
                    
                    // Silent refresh after automation
                    fetchData();
                }
            }
        } catch (error: any) {
            console.error('[Dashboard] Error loading data:', error);
            toast.error(error.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, programId, queryState]);

    const scheduleRefresh = useCallback(() => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }

        refreshTimeoutRef.current = setTimeout(() => {
            fetchData();
        }, 350);
    }, [fetchData]);

    useEffect(() => {
        if (!programId) {
            setData([]);
            setProgram(mockProgram);
            setTotalApplicationsCount(0);
            return;
        }

        fetchData();

        const appChannel = supabase
            .channel(`apps-${programId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'applications', filter: `program_id=eq.${programId}` },
                () => scheduleRefresh()
            )
            .subscribe();

        const commentChannel = supabase
            .channel(`comments-${programId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'comments' },
                () => scheduleRefresh()
            )
            .subscribe();

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
            supabase.removeChannel(appChannel);
            supabase.removeChannel(commentChannel);
        };
    }, [programId, fetchData, scheduleRefresh]);

    useEffect(() => {
        setCurrentPage(1);
    }, [programId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [queryState]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(totalApplicationsCount / pageSize));
        if (currentPage > maxPage) {
            setCurrentPage(maxPage);
        }
    }, [currentPage, pageSize, totalApplicationsCount]);

    const loadApplicantComments = useCallback(async (applicantId: string) => {
        const { data: fetchedComments, error } = await supabase
            .from('comments')
            .select(`
                id,
                application_id,
                text,
                user_id,
                column_id,
                created_at,
                user:profiles!user_id ( full_name, email, avatar_url )
            `)
            .eq('application_id', applicantId)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        const groupedComments: Record<string, any[]> = {};
        (fetchedComments || []).forEach((comment) => {
            const colId = comment.column_id || 'general';
            if (!groupedComments[colId]) groupedComments[colId] = [];
            groupedComments[colId].push({
                id: comment.id,
                text: comment.text,
                userId: comment.user_id,
                createdAt: comment.created_at,
                user: buildUserDisplay({
                    fullName: (comment.user as any)?.full_name,
                    email: (comment.user as any)?.email,
                    avatarUrl: (comment.user as any)?.avatar_url
                })
            });
        });

        return groupedComments;
    }, []);

    const handleComment = useCallback(async (id: string, text: string, columnId?: string) => {
        if (!user) return;
        const { error } = await supabase
            .from('comments')
            .insert({
                application_id: id,
                user_id: user.id,
                text: text,
                column_id: columnId || 'general'
            });

        if (error) {
            console.error('[Dashboard] Error adding comment:', error);
            toast.error("Failed to add comment");
        } else {
            toast.success("Comment added");
            fetchData();
        }
    }, [user, fetchData]);

    const handleDeleteComment = useCallback(async (commentId: string) => {
        if (!user) return;
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            console.error('[Dashboard] Error deleting comment:', error);
            toast.error("Failed to delete comment");
        } else {
            toast.success("Comment deleted");
            fetchData();
        }
    }, [user, fetchData]);

    const handleStatusChange = useCallback(async (id: string, status: string) => {
        console.log(`[Dashboard] Changing status for ${id} to ${status}...`);
        
        // Optimistic update
        setData(prev => prev.map(app => app.id === id ? { ...app, status } : app));

        const { error } = await supabase
            .from('applications')
            .update({ status: status.toLowerCase() })
            .eq('id', id);

        if (error) {
            console.error('[Dashboard] Status update error:', error);
            toast.error("Failed to update status: " + (error.message || "Unknown error"));
            fetchData();
        } else {
            // Add Log Entry
            await supabase.from('application_logs').insert({
                application_id: id,
                program_id: programId,
                event_type: 'status_change',
                message: `Status updated to ${status}`,
                details: { to: status, user: user?.id }
            });

            toast.success(`Status updated to ${status}`);
            fetchData();
        }
    }, [fetchData, programId, user]);

    const handleScoreChange = useCallback(async (applicantId: string, criterionId: string, score: number) => {
        const { data: record } = await supabase
            .from('applications')
            .select('scores')
            .eq('id', applicantId)
            .single();

        const newScores = {
            ...(record?.scores || {}),
            [criterionId]: { score, reason: 'Manual update' }
        };

        const { error } = await supabase
            .from('applications')
            .update({ scores: newScores })
            .eq('id', applicantId);

        if (error) {
            toast.error("Failed to update score");
        } else {
            // Add Log Entry
            await supabase.from('application_logs').insert({
                application_id: applicantId,
                program_id: programId,
                event_type: 'score_update',
                message: `Score updated for rubric component`,
                details: { criterionId, score, user: user?.id }
            });

            toast.success("Score updated");
            fetchData();
        }
    }, [programId, user, fetchData]);

    const handleBulkDelete = useCallback(async (ids: string[]) => {
        const { error } = await supabase
            .from('applications')
            .delete()
            .in('id', ids);

        if (error) {
            toast.error("Failed to delete applicants");
        } else {
            toast.success(`${ids.length} applicants deleted`);
            fetchData();
        }
    }, [fetchData]);

    const handleBulkStatusChange = useCallback(async (ids: string[], status: string) => {
        const { error } = await supabase
            .from('applications')
            .update({ status: status.toLowerCase() })
            .in('id', ids);

        if (error) {
            toast.error("Failed to update status");
        } else {
            toast.success(`Status updated for ${ids.length} applicants`);
            fetchData();
        }
    }, [fetchData]);

    const handleCohortRename = useCallback(async (name: string) => {
        if (!programId || !name.trim()) return;
        const { error } = await supabase
            .from('programs')
            .update({ name: name.trim() })
            .eq('id', programId);
        if (error) {
            toast.error("Failed to rename cohort");
        } else {
            toast.success("Cohort renamed");
            fetchData();
        }
    }, [programId, fetchData]);


    // Retry an edge function call with exponential backoff on transient errors (503/429).
    const invokeWithRetry = useCallback(async (
        fnName: string,
        body: object,
        maxRetries = 3
    ): Promise<{ data: any; error: any }> => {
        const RETRYABLE_MESSAGES = ['503', '429', 'unavailable', 'high demand', 'rate limit', 'overloaded'];
        let lastResult: { data: any; error: any } = { data: null, error: null };

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            lastResult = await supabase.functions.invoke(fnName, { body });
            const { data: respData, error: respError } = lastResult;

            // Determine if the error is transient and retryable
            const errorMsg = (respError?.message || respData?.error || '').toLowerCase();
            const isRetryable = RETRYABLE_MESSAGES.some(keyword => errorMsg.includes(keyword));
            const hasError = respError || (respData && respData.success === false);

            if (!hasError || !isRetryable || attempt === maxRetries) {
                return lastResult;
            }

            // Exponential backoff: 2s, 4s, 8s
            const delayMs = Math.pow(2, attempt + 1) * 1000;
            console.warn(`Gemini API transient error (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delayMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        return lastResult;
    }, []);

    const handleRunAIReview = useCallback(async (targetIds?: string[]) => {
        if (!programId) return;

        const idsToReview = targetIds || data.map(app => app.id);
        if (idsToReview.length === 0) return;

        cancelScoringRef.current = false;
        setIsScoring(true);

        // 1. Optimistic status change (frontend only)
        setData(prev => prev.map(app =>
            idsToReview.includes(app.id) ? { ...app, status: 'Reviewing' } : app
        ));

        const message = targetIds
            ? `AI review initiated for ${targetIds.length} applicants. Soft limits apply during Beta.`
            : "AI review initiated for all applicants. Soft limits apply during Beta.";

        toast.info(message, {
            description: "To ensure stability, AI requests are subject to fair-usage soft limits."
        });

        // 2. Call Edge Function for each applicant sequentially, with retry on transient errors
        try {
            const results = [];
            for (const id of idsToReview) {
                if (cancelScoringRef.current) {
                    toast.info("AI review cancelled.");
                    break;
                }
                try {
                    const { data, error } = await invokeWithRetry('score-application', {
                        application_id: id,
                        program_id: programId
                    });

                    if (error || (data && data.success === false)) {
                        const errorMsg = error?.message || data?.error || "Review failed";
                        console.error(`AI review error for applicant ${id}:`, errorMsg);
                        results.push({ id, error: errorMsg });
                    } else {
                        // Add Log Entry for AI Review
                        await supabase.from('application_logs').insert({
                            application_id: id,
                            program_id: programId,
                            event_type: 'ai_review',
                            message: `AI Review completed with score ${data.score}`,
                            details: { score: data.score, model: 'Gemini 1.5 Pro' }
                        });
                        results.push({ id, error: null });
                    }
                } catch (e: any) {
                    console.error(`Invoke crash for applicant ${id}:`, e);
                    results.push({ id, error: e.message });
                }
            }

            const failed = results.filter(r => r.error);
            if (failed.length > 0) {
                console.error("AI review failures detailed:", failed);
                toast.error(`${failed.length} review(s) failed after retries. The Gemini API may be experiencing high demand — please try again shortly.`);
            } else {
                toast.success("AI review complete!");
            }

            // Refresh data to show new scores
            fetchData();
        } catch (err) {
            console.error("AI Review error:", err);
            toast.error("Failed to execute AI review batch");
            fetchData();
        } finally {
            setIsScoring(false);
            cancelScoringRef.current = false;
        }
    }, [programId, data, fetchData, invokeWithRetry]);

    const handleCancelAIReview = useCallback(() => {
        cancelScoringRef.current = true;
        setIsScoring(false);
        toast.warning("Cancelling review... will stop after current applicant.");
    }, []);

    const handleExport = useCallback(() => {
        if (!data.length) {
            toast.info("No applicants to export.");
            return;
        }
        const safeName = (program?.name || "cohortly")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        const filename = `${safeName}-applicants-${new Date().toISOString().slice(0, 10)}.csv`;
        exportApplicationsToCSV(data, program?.rubric || [], filename);
        toast.success(`Exported ${data.length} applicants.`);
    }, [data, program]);

    const [scoreRange, setScoreRange] = useState([0, 100]);
    const [activeFilters, setActiveFilters] = useState<string[]>(['all']);
    const [selectedRowsCount, setSelectedRowsCount] = useState(0);

    const avgScore = data.length > 0
        ? Math.round(data.reduce((acc, app) => acc + (app.overallScore || 0), 0) / data.length)
        : 0;
    const acceptedCount = data.filter(app => app.status?.toLowerCase() === 'accepted').length;
    const shortlistCount = data.filter(app => ['shortlist', 'shortlisted'].includes(app.status?.toLowerCase())).length;

    // Get the target limit from threshold_rules if available
    const shortlistTarget = program?.threshold_rules?.find((t: any) => t.target === 'limit')?.value || 50;

    return (
        <div className="flex flex-col h-full overflow-hidden w-full relative">
            <SpotlightTour />
            <DashboardHeader
                cohortName={program?.id ? program.name : ""}
                isActive={program?.status === 'published'}
                totalApplicants={totalApplicationsCount}
                avgScore={avgScore}
                acceptedCount={acceptedCount}
                shortlistCount={shortlistCount}
                shortlistTarget={shortlistTarget}
                reviewers={program.reviewers}
                programId={programId}
            />
            <div className="flex-1 px-6 py-4 min-h-0 flex flex-col gap-2">
                {loading && data.length === 0 ? (
                    <div className="flex-1 min-h-0">
                        <TableSkeleton />
                    </div>
                ) : (
                    <>
                        {/* DataTable - Scrollable */}
                        <div className="flex-1 min-h-0">
                            <DataTable
                                data={data}
                                program={program}
                                onSelectionChange={setSelectedRowsCount}
                                onComment={handleComment}
                                onDeleteComment={handleDeleteComment}
                                currentUserProfile={currentUserProfile}
                                onScoreChange={handleScoreChange}
                                onStatusChange={handleStatusChange}
                                onRefresh={fetchData}
                                onBulkDelete={handleBulkDelete}
                                onBulkStatusChange={handleBulkStatusChange}
                                onBulkEmail={(ids: string[], type?: string) => toast.info(`Drafting ${type ? type.toLowerCase() + ' ' : ''}email to ${ids.length} applicants...`)}
                                onBulkInviteReviewers={(ids: string[]) => toast.info(`Inviting reviewers for ${ids.length} applicants...`)}
                                onBulkRunAIReview={(ids: string[]) => handleRunAIReview(ids)}
                                onRunAIReview={() => handleRunAIReview()}
                                isScoring={isScoring}
                                onCancelScoring={handleCancelAIReview}
                                onSettingsClick={() => setIsSettingsOpen(true)}
                                onCohortRename={handleCohortRename}
                                onExport={handleExport}
                                onImport={() => setIsImportModalOpen(true)}
                                currentPage={currentPage}
                                pageSize={pageSize}
                                totalCount={totalApplicationsCount}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={(nextPageSize) => {
                                    setPageSize(nextPageSize);
                                    setCurrentPage(1);
                                }}
                                loadApplicantComments={loadApplicantComments}
                                onQueryStateChange={setQueryState}
                            />
                        </div>
                    </>
                )}
            </div>

            <ImportApplicantsModal
                isOpen={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
                programId={programId || ""}
                onSuccess={() => {
                    fetchData();
                }}
            />

            <CohortSettingsSheet
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                program={program}
                onRefresh={fetchData}
            />
        </div>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={<TableSkeleton />}>
            <DashboardContent />
        </Suspense>
    );
}
