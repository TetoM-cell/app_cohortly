import { ScalingWrapper } from "@/components/scaling-wrapper";
import { SidebarShell } from "@/components/sidebar-shell";

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <SidebarShell />
            <ScalingWrapper className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-zinc-50/30">
                {children}
            </ScalingWrapper>
        </div>
    );
}
