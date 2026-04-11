import { Skeleton } from "@/components/ui/skeleton";

export function SearchResultSkeleton() {
    return (
        <div className="space-y-6">
            <div>
                 <Skeleton className="h-3 w-24 mb-3" />
                 <div className="space-y-1">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl">
                            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                            <Skeleton className="w-4 h-4 rounded shrink-0" />
                        </div>
                    ))}
                 </div>
            </div>
            
             <div className="space-y-1">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl">
                        <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-3 w-1/5" />
                        </div>
                        <Skeleton className="w-4 h-4 rounded shrink-0" />
                    </div>
                ))}
             </div>
        </div>
    );
}
