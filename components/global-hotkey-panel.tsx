"use client";

import { HotkeyHelpPanel } from "./hotkey-help-panel";
import { useHotkeyStore } from "@/hooks/use-hotkey-store";
import { useGlobalHotkeys, useHotkey } from "@/hooks/use-hotkeys";

export function GlobalHotkeyPanel() {
    const { isOpen, setIsOpen } = useHotkeyStore();

    // Initialize global router hotkeys (G+H, G+S, G+N)
    useGlobalHotkeys();

    // Toggle help panel globally with Shift+?
    useHotkey("shift+?", () => setIsOpen(!isOpen));

    return <HotkeyHelpPanel open={isOpen} onClose={() => setIsOpen(false)} />;
}
