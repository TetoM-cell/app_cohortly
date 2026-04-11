import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export type TableDensity = 'comfortable' | 'compact';

interface SettingsState {
    tableDensity: TableDensity;
    defaultAnonymousMode: boolean;
    isSettingsSidebarCollapsed: boolean;
    isSettingsModalOpen: boolean;
    activeSettingsTab: string;
    setTableDensity: (density: TableDensity) => void;
    toggleAnonymousDefault: () => void;
    toggleSettingsSidebar: () => void;
    openSettings: (tab?: string) => void;
    closeSettings: () => void;
    setSettingsTab: (tab: string) => void;
}

/**
 * settingsStore handles general UI preferences.
 * Persists all settings to localStorage.
 */
export const useSettingsStore = create<SettingsState>()(
    devtools(
        persist(
            (set) => ({
                tableDensity: 'comfortable',
                defaultAnonymousMode: false,
                isSettingsSidebarCollapsed: true,
                isSettingsModalOpen: false,
                activeSettingsTab: 'general',
                setTableDensity: (density) => set({ tableDensity: density }),
                toggleAnonymousDefault: () => set((state) => ({ defaultAnonymousMode: !state.defaultAnonymousMode })),
                toggleSettingsSidebar: () => set((state) => ({ isSettingsSidebarCollapsed: !state.isSettingsSidebarCollapsed })),
                openSettings: (tab) => set({ isSettingsModalOpen: true, activeSettingsTab: tab || 'general' }),
                closeSettings: () => set({ isSettingsModalOpen: false }),
                setSettingsTab: (tab) => set({ activeSettingsTab: tab }),
            }),
            {
                name: 'cohortly-settings',
            }
        ),
        { name: 'SettingsStore', enabled: process.env.NODE_ENV === 'development' }
    )
);
