"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type HotkeyOptions = {
    /** When true, the hotkey won't fire if the user is typing in an input/textarea */
    ignoreWhenTyping?: boolean;
};

type Handler = (e: KeyboardEvent) => void;

/**
 * Low-level hook: fires `handler` when the given key combination is pressed.
 * Key syntax: "f" | "alt+f" | "shift+?" | "g+h" (sequence: g then h within 1 s)
 */
export function useHotkey(
    combo: string,
    handler: Handler,
    opts: HotkeyOptions = { ignoreWhenTyping: true }
) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;
    const pendingRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            if (opts.ignoreWhenTyping) {
                const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
                const editable = (e.target as HTMLElement)?.isContentEditable;
                if (tag === "input" || tag === "textarea" || editable) return;
            }

            const parts = combo.toLowerCase().split("+");

            // Sequence (e.g. "g+h" — g then h within 1 s)
            if (parts.length === 2 && parts[0].length === 1 && parts[1].length === 1) {
                const [first, second] = parts;
                if (e.key.toLowerCase() === first && !e.altKey && !e.ctrlKey && !e.metaKey) {
                    pendingRef.current = first;
                    if (timerRef.current) clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => { pendingRef.current = null; }, 1000);
                    e.preventDefault();
                    return;
                }
                if (pendingRef.current === first && e.key.toLowerCase() === second) {
                    pendingRef.current = null;
                    if (timerRef.current) clearTimeout(timerRef.current);
                    e.preventDefault();
                    handlerRef.current(e);
                    return;
                }
                return;
            }

            // Single key with modifiers (e.g. "alt+f", "shift+?")
            const mods = parts.slice(0, -1);
            const key = parts[parts.length - 1];

            const wantsAlt = mods.includes("alt");
            const wantsShift = mods.includes("shift");
            const wantsCtrl = mods.includes("ctrl");
            const wantsMeta = mods.includes("meta");

            if (
                e.key.toLowerCase() === key &&
                e.altKey === wantsAlt &&
                e.shiftKey === wantsShift &&
                e.ctrlKey === wantsCtrl &&
                e.metaKey === wantsMeta
            ) {
                e.preventDefault();
                handlerRef.current(e);
            }
        };

        // Using capture phase to listen to keydown events before Radix UI's Dialog eats them
        window.addEventListener("keydown", listener, { capture: true });
        return () => {
            window.removeEventListener("keydown", listener, { capture: true });
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [combo, opts.ignoreWhenTyping]);
}

/**
 * All dashboard hotkeys registered in one place.
 *
 * @param actions  Callbacks for each action — pass stable references (useCallback)
 */
export function useDashboardHotkeys(actions: {
    focusSearch: () => void;
    toggleFilter: () => void;
    toggleSort: () => void;
    refreshData: () => void;
    selectNextRow: () => void;
    selectPrevRow: () => void;
    openSelected: () => void;
    closeSheet: () => void;
}) {
    const router = useRouter();

    // F — focus the applicant search bar
    useHotkey("f", actions.focusSearch);

    // Alt+F — toggle filter bar
    useHotkey("alt+f", actions.toggleFilter);

    // Alt+S — toggle sort bar  
    useHotkey("alt+s", actions.toggleSort);

    // R — refresh data
    useHotkey("r", actions.refreshData);

    // J — next row (vim-style)
    useHotkey("j", actions.selectNextRow);

    // K — prev row (vim-style)
    useHotkey("k", actions.selectPrevRow);

    // Enter — open active row's sheet
    useHotkey("enter", actions.openSelected);

    // Escape — close sheet
    useHotkey("escape", actions.closeSheet, { ignoreWhenTyping: false });
}

/**
 * Global hotkeys applicable everywhere across the application.
 */
export function useGlobalHotkeys() {
    const router = useRouter();
    // useHotkeyStore is imported if needed, but we can pass actions or handle it locally

    // G then H — go to dashboard home
    useHotkey("g+h", () => router.push("/dashboard"));

    // G then S — go to settings
    useHotkey("g+s", () => router.push("/settings"));

    // G then N — go to new cohort
    useHotkey("g+n", () => router.push("/cohorts/new"));
}

