import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
    return (
        <div className="w-full h-full flex flex-col space-y-4 rounded-xl border border-gray-100 bg-white p-4">
            {/* Toolbar Skeleton */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-50 flex-none">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-[250px] rounded-lg" />
                    <Skeleton className="h-9 w-[100px] rounded-lg" />
                    <Skeleton className="h-9 w-[100px] rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-[80px] rounded-lg" />
                    <Skeleton className="h-9 w-[120px] rounded-lg" />
                </div>
            </div>

            {/* Table Header Skeleton */}
            <div className="flex items-center gap-4 py-2 flex-none px-2 border-b border-gray-50 pb-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8" />
            </div>

            {/* Table Rows Skeleton */}
            <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-3 px-2 border border-gray-50/50 rounded-xl bg-gray-50/30">
                        <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
                        <div className="flex flex-col gap-2 w-48 flex-shrink-0">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                        </div>
                        <Skeleton className="h-6 w-24 rounded-full flex-shrink-0" />
                        
                        <div className="flex-1 flex gap-4 ml-8">
                           <Skeleton className="h-8 w-16 rounded-md" />
                           <Skeleton className="h-8 w-16 rounded-md" />
                           <Skeleton className="h-8 w-16 rounded-md" />
                        </div>
                        
                        <div className="flex items-center gap-3 pr-2 flex-shrink-0">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-6 w-6 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Pagination Skeleton */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-50 flex-none px-2">
                 <Skeleton className="h-4 w-32" />
                 <div className="flex gap-2">
                     <Skeleton className="h-8 w-8 rounded-md" />
                     <Skeleton className="h-8 w-8 rounded-md" />
                 </div>
            </div>
        </div>
    );
}
