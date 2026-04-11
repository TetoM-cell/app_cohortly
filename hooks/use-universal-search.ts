"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUniversalSearchStore } from './use-universal-search-store';
import { supabase } from "@/lib/supabase/client";
import { useSettingsStore } from '@/stores/settingsStore';

export function useUniversalSearchShortcut() {
    const { toggle } = useUniversalSearchStore();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggle();
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [toggle]);
}

export type ResultType = 'program' | 'setting' | 'action';

export interface SearchResult {
    id: string;
    title: string;
    path: string;
    href: string;
    type: ResultType;
};

const STATIC_RESULTS: SearchResult[] = [
    { id: "settings-profile", title: "Profile", path: "Settings › Profile", href: "settings:profile", type: "setting" },
    { id: "settings-billing", title: "Billing & Plans", path: "Settings › Billing & Plans", href: "settings:billing", type: "setting" },
    { id: "settings-notifications", title: "Notifications", path: "Settings › Notifications", href: "settings:notifications", type: "setting" },
    { id: "settings-integrations", title: "Integrations", path: "Settings › Integrations", href: "settings:integrations", type: "setting" },
    { id: "settings-team", title: "Team & Reviewers", path: "Settings › Team & Reviewers", href: "settings:team", type: "setting" },
    { id: "settings-appearance", title: "Appearance", path: "Settings › Appearance", href: "settings:appearance", type: "setting" },
    { id: "action-new-cohort", title: "Create New Cohort", path: "Dashboard › New Cohort", href: "/cohorts/new", type: "action" },
    { id: "action-all-programs", title: "View All Programs", path: "Dashboard", href: "/dashboard", type: "action" },
];

export function useUniversalSearch() {
    const { isOpen, setIsOpen } = useUniversalSearchStore();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchResults = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const lower = q.toLowerCase();
            const staticMatches = STATIC_RESULTS.filter(
                (r) => r.title.toLowerCase().includes(lower) || r.path.toLowerCase().includes(lower)
            );

            const { data: { user } } = await supabase.auth.getUser();
            let programMatches: SearchResult[] = [];

            if (user) {
                const { data: programs } = await supabase
                    .from("programs")
                    .select("id, name, slug, status")
                    .eq("owner_id", user.id)
                    .ilike("name", `%${q}%`)
                    .limit(8);

                if (programs) {
                    programMatches = programs.map((p) => ({
                        id: p.id,
                        title: p.name,
                        path: `Program › ${p.status === "draft" ? "Draft" : "Published"}`,
                        href: `/dashboard?id=${p.id}`,
                        type: "program" as ResultType,
                    }));
                }
            }

            setResults([...programMatches, ...staticMatches].slice(0, 10));
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setQuery("");
            setResults([]);
            return;
        }
        const timer = setTimeout(() => fetchResults(query), 250);
        return () => clearTimeout(timer);
    }, [query, fetchResults, isOpen]);

    const onSelect = (href: string) => {
        setIsOpen(false);
        if (href.startsWith("settings:")) {
            const tab = href.split(":")[1];
            const openSettings = useSettingsStore.getState().openSettings;
            openSettings(tab as any);
        } else {
            router.push(href);
        }
    };

    return {
        isOpen,
        setIsOpen,
        query,
        setQuery,
        results,
        onSelect,
        isLoading
    };
}
