'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { Plus, Rocket, Loader2, UsersRound } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { exportApplicationsToCSV } from '@/lib/export';
import { buildUserDisplay, getDisplayName } from '@/lib/user-display';
import { DataTable } from "./components/data-table";
import { Application } from "./components/columns";
import { DashboardHeader } from "./components/dashboard-header";
import { CohortSettingsSheet } from "./components/cohort-settings-sheet";
import { SpotlightTour } from "@/components/SpotlightTour";
import { TableSkeleton } from "./components/table-skeleton";
import { ImportApplicantsModal } from "./components/import-applicants-modal";

interface SavedView {
    id: string;
    name: string;
    filters: string[];
    tags: string[];
    reviewers: string[];
    scoreRange: number[];
}

const mockProgram = {
    id: "",
    name: "Select a cohort",
    rubric: [],
    reviewers: []
};

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
    const fetchIdRef = useRef(0);

    // Refs so fetchData always reads the latest values without needing them
    // as useCallback deps (avoids stale-closure / infinite-loop problems).
    const currentPageRef = useRef(currentPage);
    const pageSizeRef = useRef(pageSize);
    const queryStateRef = useRef(queryState);

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

    // Keep refs in sync with state so fetchData can read them without being
    // re-created on every pagination / filter change.
    useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
    useEffect(() => { pageSizeRef.current = pageSize; }, [pageSize]);
    useEffect(() => { queryStateRef.current = queryState; }, [queryState]);

    const fetchData = useCallback(async () => {
        if (!programId) return;
        
        const currentPage = currentPageRef.current;
        const pageSize = pageSizeRef.current;
        const queryState = queryStateRef.current;
        const currentFetchId = ++fetchIdRef.current;
        
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
                supabase.from('rubrics').select('*').eq('program_id', programId),
                supabase.from('program_reviewers').select('user_id, profiles:user_id ( full_name, email, avatar_url )').eq('program_id', programId),
                supabase.from('threshold_rules').select('*').eq('program_id', programId),
                supabase.from('forms').select('fields').eq('program_id', programId).maybeSingle(),
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
                            appsQuery = appsQuery.gte('overall_ai_score', Number(filter.value[0])).lte('overall_ai_score', Number(filter.value[1]));
                        }
                        if (filter.id === 'submittedDate' && isDateRangeFilter(filter.value)) {
                            if (filter.value.from) appsQuery = appsQuery.gte('submitted_at', filter.value.from.toISOString());
                            if (filter.value.to) {
                                const inclusiveEnd = new Date(filter.value.to);
                                inclusiveEnd.setHours(23, 59, 59, 999);
                                appsQuery = appsQuery.lte('submitted_at', inclusiveEnd.toISOString());
                            }
                        }
                        if (filter.id.startsWith('score_') && Array.isArray(filter.value) && filter.value.length === 2) {
                            const rubricId = filter.id.replace('score_', '');
                            appsQuery = appsQuery
                                .gte(`scores->${rubricId}->>score`, Number(filter.value[0]))
                                .lte(`scores->${rubricId}->>score`, Number(filter.value[1]));
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

                    let sortColumn = primarySort ? (sortableColumnMap as any)[primarySort.id] : undefined;
                    if (sortColumn) {
                        appsQuery = appsQuery.order(sortColumn, { ascending: !primarySort.desc });
                    } else if (primarySort?.id.startsWith('score_')) {
                        const rubricId = primarySort.id.replace('score_', '');
                        appsQuery = appsQuery.order(`scores->${rubricId}->>score`, { ascending: !primarySort.desc });
                    } else {
                        appsQuery = appsQuery.order('submitted_at', { ascending: false });
                    }

                    return appsQuery.range(from, to);
                })()
            ]);

            if (rubricError) throw new Error(`Failed to fetch rubrics: ${rubricError.message}`);
            if (reviewersError) throw new Error(`Failed to fetch reviewers: ${reviewersError.message}`);
            if (thresholdError) throw new Error(`Failed to fetch threshold rules: ${thresholdError.message}`);
            if (appsError) throw new Error(`Failed to fetch applications: ${appsError.message}`);

            if (currentFetchId !== fetchIdRef.current) return;

            setTotalApplicationsCount(appsCount ?? 0);

            let commentPresenceData: any[] = [];
            if (appsData && appsData.length > 0) {
                const { data: fetchedCommentPresence, error: commentsError } = await supabase
                    .from('comments')
                    .select('application_id')
                    .in('application_id', appsData.map(a => a.id));

                if (commentsError) throw new Error(`Failed to fetch comments: ${commentsError.message}`);
                commentPresenceData = fetchedCommentPresence || [];
            }

            const commentedApplicationIds = new Set(commentPresenceData.map(c => c.application_id));

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

            const mappedApps = (appsData || []).map(app => {
                const scoreEntries = Object.entries(app.scores || {});
                const mappedScores: Record<string, number> = {};
                scoreEntries.forEach(([key, value]: [string, any]) => {
                    const rawScore = (value && typeof value === 'object') ? (value as any).score : value;
                    (mappedScores as any)[key] = typeof rawScore === 'string' ? parseFloat(rawScore) : rawScore;
                });

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
                };
            });

            setData(mappedApps);

            // --- AUTOMATION ENGINE ---
            const scoredApps = mappedApps.filter(app => app.status?.toLowerCase() === 'scored');
            const rules = thresholdData || [];
            if (scoredApps.length > 0 && rules.length > 0) {
                const updates = scoredApps.map(app => {
                    let newStatus = null;
                    const shortlistRule = rules.find(r => r.action === 'shortlist');
                    const rejectRule = rules.find(r => r.action === 'reject');
                    if (shortlistRule && app.overallScore >= shortlistRule.value) newStatus = 'shortlist';
                    else if (rejectRule && app.overallScore < rejectRule.value) newStatus = 'rejected';
                    return newStatus ? { id: app.id, status: newStatus } : null;
                }).filter(u => u !== null);

                if (updates.length > 0) {
                    const byStatus: Record<string, string[]> = {};
                    updates.forEach(u => {
                        if (u) {
                            if (!byStatus[u.status]) byStatus[u.status] = [];
                            byStatus[u.status].push(u.id);
                        }
                    });
                    for (const [status, ids] of Object.entries(byStatus) as [string, string[]][]) {
                        await supabase.from('applications').update({ status: status }).in('id', ids);
                        const logEntries = ids.map((id: string) => ({
                            application_id: id,
                            program_id: programId,
                            event_type: 'status_change',
                            message: `Auto-${status} via Threshold Rules`,
                            details: { to: status, automation: true }
                        }));
                        await supabase.from('application_logs').insert(logEntries);
                    }
                }
            }
        } catch (error: any) {
            console.error('[Dashboard] Error loading data:', error);
            toast.error(error.message || "Failed to load dashboard data");
        } finally {
            setTimeout(() => setLoading(false), 100);
        }
    }, [programId]);
    // scheduleRefresh is stable: it reads fetchData via the programId-stable
    // fetchData reference (fetchData only changes when programId changes).
    const scheduleRefresh = useCallback(() => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
            fetchData();
        }, 350);
    }, [fetchData]);

    // ── Primary data-fetch effect ──────────────────────────────────────────
    // Runs when programId changes (new cohort selected).
    // Pagination / filter changes are handled by the effect below.
    useEffect(() => {
        if (!programId) {
            setData([]);
            setProgram(mockProgram);
            setTotalApplicationsCount(0);
            return;
        }
        fetchData();
    }, [programId, fetchData]);

    // ── Re-fetch on pagination / filter changes ────────────────────────────
    // Uses a stable fetchData (programId dep only) so this cannot loop.
    useEffect(() => {
        if (!programId) return;
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, pageSize, queryState]);

    // ── Reset to page 1 when cohort or filters change ─────────────────────
    useEffect(() => { setCurrentPage(1); }, [programId, queryState]);

    // Safety timeout: ensure loading is never stuck
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                setLoading(false);
            }, 10000); // 10 second fallback
            return () => clearTimeout(timer);
        }
    }, [loading]);


    // ── Realtime subscriptions (once per programId) ────────────────────────
    useEffect(() => {
        if (!programId) return;

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
    }, [programId, scheduleRefresh]);

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

    const handleCancelAIReview = useCallback(() => {
        cancelScoringRef.current = true;
        setIsScoring(false);
        toast.info("AI review cancelled.");
    }, []);

    const handleRunAIReview = useCallback(async (ids?: string[]) => {
        if (!programId || !program?.rubric?.length) {
            toast.error("No rubric configured for this cohort.");
            return;
        }


        const targets = ids
            ? data.filter(app => ids.includes(app.id))
            : data.filter(app => !app.overallScore || app.status?.toLowerCase() === 'new');

        if (!targets.length) {
            toast.info("No applicants to review.");
            return;
        }

        cancelScoringRef.current = false;
        setIsScoring(true);
        toast.info(`Starting AI review for ${targets.length} applicant(s)…`);

        let completed = 0;
        let failed = 0;

        for (const app of targets) {
            if (cancelScoringRef.current) break;

            try {
                const { error } = await supabase.functions.invoke('score-application', {
                    body: {
                        application_id: app.id,
                        program_id: programId,
                    },
                });

                if (error) throw error;
                completed++;
            } catch (err: any) {
                console.error(`[AI Review] Failed for ${app.id}:`, err);
                failed++;
            }
        }

        setIsScoring(false);

        if (cancelScoringRef.current) {
            toast.warning(`AI review stopped. ${completed} completed, ${failed} failed.`);
        } else if (failed > 0) {
            toast.warning(`AI review done. ${completed} succeeded, ${failed} failed.`);
        } else {
            toast.success(`AI review complete for ${completed} applicant(s).`);
        }

        fetchData();
    }, [programId, program, data, fetchData]);

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
