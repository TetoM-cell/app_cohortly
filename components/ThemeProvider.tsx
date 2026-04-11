'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useThemeStore, Theme } from '@/stores/themeStore';

interface ThemeProviderProps {
    children: React.ReactNode;
}

/**
 * ThemeProvider synchronizes the Zustand theme state with the DOM.
 * It handles 'light', 'dark', and 'system' modes.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const theme = useThemeStore((state) => state.theme);
    const getEffectiveTheme = useThemeStore((state) => state.getEffectiveTheme);
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch by waiting until mounted
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const applyTheme = () => {
            const effectiveTheme = getEffectiveTheme();
            const root = window.document.documentElement;

            root.classList.remove('light', 'dark');
            root.classList.add(effectiveTheme);

            // Also update color-scheme for scrollbars and browser UI
            root.style.colorScheme = effectiveTheme;
        };

        applyTheme();

        // Listen for system preference changes if 'system' is selected
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme();

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme, getEffectiveTheme, mounted]);

    // If not mounted, we can safely render children without custom classes 
    // to avoid flash of unstyled content (FOUC) vs hydration issues.
    // The CSS usually defaults to one (e.g. light).
    return <>{children}</>;
};
