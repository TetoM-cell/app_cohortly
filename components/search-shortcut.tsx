"use client";

import { useUniversalSearchShortcut } from "@/hooks/use-universal-search";

/**
 * Mounts the global Ctrl+K → /search keyboard shortcut.
 * Rendered as a client component inside the server root layout.
 */
export function SearchShortcut() {
    useUniversalSearchShortcut();
    return null;
}
