import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    getEffectiveTheme: () => 'light' | 'dark';
}

/**
 * themeStore handles the user's theme preference.
 * It resolves 'system' preference using window.matchMedia.
 */
export const useThemeStore = create<ThemeState>()(
    devtools(
        persist(
            (set, get) => ({
                theme: 'system',
                setTheme: (theme) => set({ theme }),
                getEffectiveTheme: () => {
                    const { theme } = get();
                    if (theme !== 'system') return theme;

                    if (typeof window !== 'undefined') {
                        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }
                    return 'light'; // Default for SSR
                },
            }),
            {
                name: 'cohortly-theme',
                // Persist only the theme preference
                partialize: (state) => ({ theme: state.theme }),
            }
        ),
        { name: 'ThemeStore', enabled: process.env.NODE_ENV === 'development' }
    )
);
