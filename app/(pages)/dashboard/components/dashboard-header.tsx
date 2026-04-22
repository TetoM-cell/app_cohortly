import React from 'react';
import { Users, Activity, CheckCircle, Target, UsersRound, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardHeaderProps {
    cohortName?: string;
    isActive?: boolean;
    totalApplicants?: number;
    avgScore?: number;
    acceptedCount?: number;
    shortlistCount?: number;
    shortlistTarget?: number;
    reviewers?: any[];
    programId?: string | null;
}

export function DashboardHeader({
    cohortName = "",
    isActive = false,
    totalApplicants = 0,
    avgScore = 0,
    acceptedCount = 0,
    shortlistCount = 0,
    shortlistTarget = 50,
    reviewers = [],
    programId,
}: DashboardHeaderProps) {
    const acceptedPercent = totalApplicants > 0 ? Math.round((acceptedCount / totalApplicants) * 100) : 0;


    return (
        <div className="w-full h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
            {/* Left: Cohort Title */}
            <div className="flex items-center min-w-0 flex-1 mr-6">
                <div className="relative min-w-0 flex items-center flex-1">
                    <div className="font-semibold text-gray-900 flex items-center gap-2 min-w-0">
                        <span className="truncate">{cohortName || <span className="text-gray-400 font-normal italic">No cohort selected</span>}</span>
                    </div>
                </div>

                <div className="flex items-center shrink-0 ml-4 min-w-[120px] justify-end">
                    <div className="h-4 w-[1px] bg-gray-200 mr-4" />

                    {reviewers.length > 0 ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center -space-x-2 cursor-pointer">
                                    {reviewers.slice(0, 3).map((reviewer, index) => (
                                        <div
                                            key={index}
                                            className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 relative transition-transform hover:scale-105 hover:z-10"
                                            style={{ zIndex: 3 - index }}
                                        >
                                            {reviewer.full_name ? reviewer.full_name.charAt(0).toUpperCase() : (reviewer.email ? reviewer.email.charAt(0).toUpperCase() : "?")}
                                        </div>
                                    ))}
                                    {reviewers.length > 3 && (
                                        <div
                                            className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600 relative z-0"
                                        >
                                            +{reviewers.length - 3}
                                        </div>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs py-2 px-3">
                                {(() => {
                                    const names = reviewers.slice(0, 2).map(r => r.full_name || r.email.split('@')[0]);
                                    const remaining = reviewers.length - 2;

                                    if (reviewers.length === 0) return "No reviewers";
                                    if (reviewers.length === 1) return names[0];
                                    if (reviewers.length === 2) return `${names[0]} and ${names[1]}`;
                                    return `${names[0]}, ${names[1]}, and ${remaining} more`;
                                })()}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-7 h-7 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 cursor-help hover:bg-gray-50 transition-colors">
                                    <UsersRound className="w-3.5 h-3.5" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                <p>No active reviewers assigned.</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Manage team in Settings.</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* Right: Stats Bar */}
            <div className="flex items-center gap-6" id="dashboard-stats">
                {/* Total Stats */}
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="p-1.5 rounded-md bg-gray-50 cursor-help">
                                <Users className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Total Applicants
                        </TooltipContent>
                    </Tooltip>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-semibold text-gray-500 leading-tight">Applicants</span>
                        <span className="text-sm font-semibold text-gray-900 leading-tight">{totalApplicants.toLocaleString()}</span>
                    </div>
                </div>

                <div className="h-6 w-[1px] bg-gray-100" />

                {/* Avg Score */}
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="p-1.5 rounded-md bg-gray-50 cursor-help">
                                <Activity className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Average Candidate Score
                        </TooltipContent>
                    </Tooltip>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-semibold text-gray-500 leading-tight">Avg Score</span>
                        <span className="text-sm font-semibold text-gray-900 leading-tight">{avgScore} <span className="text-xs text-gray-400 font-normal">/ 100</span></span>
                    </div>
                </div>

                <div className="h-6 w-[1px] bg-gray-100" />

                {/* Funnel Health (Simplified) */}
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="p-1.5 rounded-md bg-gray-50 cursor-help">
                                <CheckCircle className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Application Conversion
                        </TooltipContent>
                    </Tooltip>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-semibold text-gray-500 leading-tight">Accepted</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-green-600 leading-tight">{acceptedCount}</span>
                            <span className="text-[10px] text-gray-400">({acceptedPercent}%)</span>
                        </div>
                    </div>
                </div>

                <div className="h-6 w-[1px] bg-gray-100" />

                {/* Shortlist Target */}
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="p-1.5 rounded-md bg-gray-50 cursor-help">
                                <Target className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Hiring Target Progress
                        </TooltipContent>
                    </Tooltip>
                    <div className="flex flex-col min-w-[100px]">
                        <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[10px] uppercase font-semibold text-gray-500 leading-tight">Shortlist</span>
                            <span className="text-[10px] font-medium text-gray-900 leading-tight">{shortlistCount} / {shortlistTarget}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${shortlistTarget > 0 ? (shortlistCount / shortlistTarget) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
