"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Preferences {
    density: "comfortable" | "compact";
    dateFormat: string;
    anonymousMode: boolean;
    scaling: "110" | "100" | "90" | "80" | "75";
}

interface PreferencesContextType {
    preferences: Preferences;
    updatePreference: (key: keyof Preferences, value: any) => Promise<void>;
    isLoading: boolean;
}

const defaultPreferences: Preferences = {
    density: "comfortable",
    dateFormat: "MM/DD/YYYY",
    anonymousMode: false,
    scaling: "100",
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchPreferences = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                setUser(user);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('preferences')
                    .eq('id', user.id)
                    .single();

                if (profile?.preferences) {
                    setPreferences((prev) => ({
                        ...prev,
                        ...profile.preferences,
                    }));
                }
            }
            setIsLoading(false);
        };

        fetchPreferences();
    }, []);

    const updatePreference = async (key: keyof Preferences, value: any) => {
        // Optimistic UI update
        setPreferences((prev) => ({ ...prev, [key]: value }));

        if (!user) return;

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('id', user.id)
                .single();

            const currentPrefs = profile?.preferences || {};
            const newPrefs = { ...currentPrefs, [key]: value };

            const { error } = await supabase
                .from('profiles')
                .update({ preferences: newPrefs })
                .eq('id', user.id);

            if (error) throw error;
            // toast.success("Preference saved"); // Optional: reduce noise
        } catch (error) {
            console.error("Error saving preference:", error);
            toast.error("Failed to save preference");
            // Revert on error? For now, we keep optimistic state to avoid jumpiness
        }
    };

    return (
        <PreferencesContext.Provider value={{ preferences, updatePreference, isLoading }}>
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error("usePreferences must be used within a PreferencesProvider");
    }
    return context;
}
