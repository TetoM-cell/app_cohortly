import { Skeleton } from "@/components/ui/skeleton";

export function FormSkeleton() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-32">
            {/* Header / Progress Bar Skeleton */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
                <div className="h-1.5 w-full bg-gray-100">
                    <Skeleton className="h-full w-1/4 rounded-none" />
                </div>
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                </div>
            </div>

            <div className="pt-32 pb-12 px-6">
                <div className="max-w-3xl mx-auto space-y-12">
                    {/* Section Header Skeleton */}
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>

                    {/* Questions Skeleton */}
                    <div className="space-y-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="space-y-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-3 w-64" />
                                </div>
                                <Skeleton className="h-12 w-full rounded-xl" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Navigation Footer Skeleton */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-gray-100 py-4 px-6">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                    <Skeleton className="h-11 w-24 rounded-xl" />
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-11 w-28 rounded-xl hidden sm:block" />
                        <Skeleton className="h-11 w-36 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
