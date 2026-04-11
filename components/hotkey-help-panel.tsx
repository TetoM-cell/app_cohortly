"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HotkeyRef {
    keys: string[];
    label: string;
}

const GROUPS: { title: string; items: HotkeyRef[] }[] = [
    {
        title: "Navigation",
        items: [
            { keys: ["G", "H"], label: "Go to Dashboard" },
            { keys: ["G", "S"], label: "Go to Settings" },
            { keys: ["G", "N"], label: "New Cohort" },
        ],
    },
    {
        title: "Table",
        items: [
            { keys: ["J"], label: "Select next row" },
            { keys: ["K"], label: "Select previous row" },
            { keys: ["Enter"], label: "Open applicant detail" },
            { keys: ["Esc"], label: "Close applicant sheet" },
        ],
    },
    {
        title: "Toolbar",
        items: [
            { keys: ["F"], label: "Focus applicant search" },
            { keys: ["Alt", "F"], label: "Toggle filter bar" },
            { keys: ["Alt", "S"], label: "Toggle sort bar" },
            { keys: ["R"], label: "Refresh data" },
        ],
    },
    {
        title: "Global",
        items: [
            { keys: ["Ctrl", "K"], label: "Universal search" },
            { keys: ["Shift", "?"], label: "Show this help" },
        ],
    },
];

interface HotkeyHelpPanelProps {
    open: boolean;
    onClose: () => void;
}

export function HotkeyHelpPanel({ open, onClose }: HotkeyHelpPanelProps) {
    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</p>
                        <p className="text-xs text-gray-400 mt-0.5">Navigate faster without a mouse</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                    {GROUPS.map((group) => (
                        <div key={group.title}>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                                {group.title}
                            </p>
                            <div className="space-y-1.5">
                                {group.items.map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="text-sm text-gray-600">{item.label}</span>
                                        <div className="flex items-center gap-1">
                                            {item.keys.map((key, i) => (
                                                <span key={i} className="flex items-center gap-1">
                                                    <kbd className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[11px] font-mono font-medium text-gray-600 shadow-sm min-w-[24px]">
                                                        {key}
                                                    </kbd>
                                                    {/* Show "then" between sequence keys (G H), "+" between modifier keys (Alt F) */}
                                                    {i < item.keys.length - 1 && (
                                                        <span className="text-[10px] text-gray-300">
                                                            {["Alt", "Shift", "Ctrl", "Cmd"].includes(item.keys[i]) ? "+" : "then"}
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="px-5 py-3 border-t border-gray-100 shrink-0">
                    <p className="text-xs text-gray-400 text-center">
                        Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">Shift+?</kbd> to toggle
                    </p>
                </div>
            </div>
        </>
    );
}
