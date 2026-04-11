import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function WizardSkeleton() {
    return (
        <div className="min-h-screen bg-[#FBFCFD] pb-32">
            {/* Header Content Skeleton */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-8 py-10">
                    <div className="flex items-center justify-center max-w-2xl mx-auto mb-12">
                        <div className="flex items-center w-full gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <React.Fragment key={i}>
                                    <div className="flex flex-col items-center gap-2">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                    {i < 4 && <Skeleton className="flex-1 h-0.5" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex-1 space-y-3">
                            <Skeleton className="h-10 w-2/3" />
                            <Skeleton className="h-6 w-1/2" />
                        </div>
                        <Skeleton className="h-10 w-[120px] rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Form Steps Skeleton */}
            <div className="max-w-5xl mx-auto px-8 py-12 space-y-8">
                {/* section-like card */}
                {[1, 2].map((i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-8 space-y-8">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[1, 2].map((j) => (
                                <div key={j} className="space-y-3">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-[52px] w-full rounded-lg" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Bottom Action Skeleton */}
                <div className="bg-black/5 rounded-2xl p-10 flex flex-col items-center space-y-8">
                    <div className="space-y-3 flex flex-col items-center">
                        <Skeleton className="h-6 w-24 rounded-full bg-gray-200" />
                        <Skeleton className="h-8 w-64 bg-gray-200" />
                        <Skeleton className="h-4 w-48 bg-gray-200" />
                    </div>
                    <div className="flex gap-4">
                        <Skeleton className="h-14 w-64 rounded-xl bg-gray-200" />
                        <Skeleton className="h-14 w-32 rounded-xl bg-gray-200" />
                    </div>
                </div>
            </div>
        </div>
    );
}
