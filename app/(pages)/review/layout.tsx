import { Suspense } from "react";
import { ScalingWrapper } from "@/components/scaling-wrapper";

export default function ReviewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <ScalingWrapper className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
                {children}
            </ScalingWrapper>
        </div>
    );
}
