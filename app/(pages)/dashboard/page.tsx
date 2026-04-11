'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Rocket, Loader2, UsersRound } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { exportApplicationsToCSV } from '@/lib/export';

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
    const cancelScoringRef = useRef(false);

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

                if (profile) {
                    setCurrentUserProfile(profile);
                } else {
                    setCurrentUserProfile({
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
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

            const { data: rubricData, error: rubricError } = await supabase
                .from('rubrics')
                .select('*')
                .eq('program_id', programId);

            if (rubricError) throw new Error(`Failed to fetch rubrics: ${rubricError.message}`);

            // Fetch Reviewers
            const { data: reviewersData, error: reviewersError } = await supabase
                .from('program_reviewers')
                .select(`
                    user_id,
                    profiles:user_id ( full_name, email, avatar_url )
                `)
                .eq('program_id', programId);

            if (reviewersError) throw new Error(`Failed to fetch reviewers: ${reviewersError.message}`);

            // Fetch Threshold Rules
            const { data: thresholdData, error: thresholdError } = await supabase
                .from('threshold_rules')
                .select('*')
                .eq('program_id', programId);

            if (thresholdError) throw new Error(`Failed to fetch threshold rules: ${thresholdError.message}`);

            // Fetch Form Structure
            const { data: formData, error: formError } = await supabase
                .from('forms')
                .select('fields')
                .eq('program_id', programId)
                .maybeSingle();

            if (formError) console.error('Error fetching form:', formError);

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

            const { data: appsData, error: appsError } = await supabase
                .from('applications')
                .select('*')
                .eq('program_id', programId)
                .order('submitted_at', { ascending: false });

            if (appsError) throw new Error(`Failed to fetch applications: ${appsError.message}`);

            // Fetch comments for these applications only if we have applications
            let commentsData: any[] = [];
            if (appsData && appsData.length > 0) {
                const { data: fetchedComments, error: commentsError } = await supabase
                    .from('comments')
                    .select(`
                        id,
                        application_id,
                        text,
                        user_id,
                        column_id,
                        created_at,
                        user:profiles!user_id ( full_name, avatar_url )
                    `)
                    .in('application_id', appsData.map(a => a.id));

                if (commentsError) throw new Error(`Failed to fetch comments: ${commentsError.message}`);
                commentsData = fetchedComments || [];
            }

            const mappedApps: Application[] = (appsData || []).map(app => {
                // Map score objects
                const scoreEntries = Object.entries(app.scores || {});
                const mappedScores: any = {};
                scoreEntries.forEach(([key, value]: [string, any]) => {
                    const rawScore = typeof value === 'object' ? value.score : value;
                    mappedScores[key] = typeof rawScore === 'string' ? parseFloat(rawScore) : rawScore;
                });

                // Group comments by column_id
                const appComments: Record<string, any[]> = {};
                (commentsData || []).filter(c => c.application_id === app.id).forEach(c => {
                    const colId = c.column_id || 'general';
                    if (!appComments[colId]) appComments[colId] = [];
                    appComments[colId].push({
                        id: c.id,
                        text: c.text,
                        userId: c.user_id,
                        createdAt: c.created_at,
                        user: {
                            name: (c.user as any)?.full_name,
                            avatarUrl: (c.user as any)?.avatar_url
                        }
                    });
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
                    comments: appComments,
                    answers: app.answers,
                    aiExplanation: app.ai_explanation
                } as Application;
            });

            setData(mappedApps);
        } catch (error: any) {
            console.error('[Dashboard] Error loading data:', error);
            toast.error(error.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [programId]);

    useEffect(() => {
        if (!programId) {
            setData([]);
            setProgram(mockProgram);
            return;
        }

        fetchData();

        const appChannel = supabase
            .channel(`apps-${programId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'applications', filter: `program_id=eq.${programId}` },
                () => fetchData()
            )
            .subscribe();

        const commentChannel = supabase
            .channel(`comments-${programId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'comments' },
                () => fetchData()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(appChannel);
            supabase.removeChannel(commentChannel);
        };
    }, [programId]);

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
        }
    }, []);

    const handleStatusChange = useCallback(async (id: string, status: string) => {
        // Optimistic update
        const oldData = [...data];
        setData(prev => prev.map(app => app.id === id ? { ...app, status } : app));

        const { error } = await supabase
            .from('applications')
            .update({ status: status.toLowerCase() })
            .eq('id', id);

        if (error) {
            console.error('[Dashboard] Status update error:', error);
            toast.error("Failed to update status: " + (error.message || "Unknown error"));
            setData(oldData);
        } else {
            toast.success(`Status updated to ${status}`);
        }
    }, [data]);

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

        // 2. Call Edge Function for each applicant
        // We use sequential or throttled calls to avoid overwhelming the API if it's a huge batch, 
        // but for typical cohorts Promise.all is fine.
        try {
            const results = [];
            for (const id of idsToReview) {
                if (cancelScoringRef.current) {
                    toast.info("AI review cancelled.");
                    break;
                }
                try {
                    const { data, error } = await supabase.functions.invoke('score-application', {
                        body: { application_id: id, program_id: programId }
                    });

                    if (error || (data && data.success === false)) {
                        const errorMsg = error?.message || data?.error || "Review failed";
                        console.error(`AI review error for applicant ${id}:`, errorMsg);
                        results.push({ id, error: errorMsg });
                    } else {
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
                toast.error(`${failed.length} reviews failed. See console for details.`);
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
    }, [programId, data, fetchData]);

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
    const shortlistTarget = program?.threshold_rules?.find((t: any) => t.action === 'target')?.value || 50;

    return (
        <div className="flex flex-col h-full overflow-hidden w-full relative">
            <SpotlightTour />
            <DashboardHeader
                cohortName={program?.id ? program.name : ""}
                isActive={program?.status === 'published'}
                totalApplicants={data.length}
                avgScore={avgScore}
                acceptedCount={acceptedCount}
                shortlistCount={shortlistCount}
                shortlistTarget={shortlistTarget}
                reviewers={program.reviewers}
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