import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { ScalingWrapper } from "@/components/scaling-wrapper";

export default function InboxLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <Suspense fallback={<div className="w-[240px] h-full bg-gray-50/50 border-r border-gray-200" />}>
                <Sidebar />
            </Suspense>
            <ScalingWrapper className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-white">
                {children}
            </ScalingWrapper>
        </div>
    );
}
