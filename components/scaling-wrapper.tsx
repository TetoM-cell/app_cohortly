"use client";

import React, { useEffect, useState } from "react";
import { usePreferences } from "@/app/context/preferences-context";

export function ScalingWrapper({ children, className }: { children: React.ReactNode, className?: string }) {
    const { preferences, isLoading } = usePreferences();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || isLoading) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div
            className={className}
            style={{
                zoom: `${preferences.scaling}%`,
                transition: "zoom 0.3s ease-out"
            } as React.CSSProperties}
        >
            {children}
        </div>
    );
}
