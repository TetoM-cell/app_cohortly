import { ScalingWrapper } from "@/components/scaling-wrapper";
import { SidebarShell } from "@/components/sidebar-shell";

export default function InboxLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <SidebarShell />
            <ScalingWrapper className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-white">
                {children}
            </ScalingWrapper>
        </div>
    );
}
