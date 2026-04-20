"use client";

import dynamic from "next/dynamic";

export const SidebarShell = dynamic(
    () => import("@/components/sidebar").then((mod) => mod.Sidebar),
    {
        ssr: false,
        loading: () => <div className="w-[240px] h-full bg-gray-50/50 border-r border-gray-200" />,
    }
);
