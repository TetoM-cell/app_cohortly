import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    timezone?: string;
}

interface UserState {
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
    logout: () => void;
}

/**
 * userStore handles authentication state and user profile data.
 * Persists only the user object to avoid 'isAuthenticated' being true before hydration.
 */
export const useUserStore = create<UserState>()(
    devtools(
        persist(
            (set) => ({
                user: null,
                isAuthenticated: false,
                setUser: (user) => set({ user, isAuthenticated: !!user }),
                logout: () => set({ user: null, isAuthenticated: false }),
            }),
            {
                name: 'cohortly-user',
                // Important: Persist only the user object. 
                // isAuthenticated will be derived on hydration or manual set.
                // This avoids hydration mismatch flickering if user is stored but component renders before hydration.
                partialize: (state) => ({ user: state.user }),
                onRehydrateStorage: () => (state) => {
                    // Manually update isAuthenticated based on rehydrated user
                    if (state?.user) {
                        state.isAuthenticated = true;
                    }
                },
            }
        ),
        { name: 'UserStore', enabled: process.env.NODE_ENV === 'development' }
    )
);
