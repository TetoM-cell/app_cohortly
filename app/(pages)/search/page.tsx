"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
    Search,
    FileText,
    Settings,
    Zap,
    ArrowLeft,
    ArrowRight,
    Plus,
    Users,
    Palette,
    Bell,
    CreditCard,
    Link,
    LayoutDashboard,
    Loader2,
    Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScalingWrapper } from "@/components/scaling-wrapper";
import { SearchResultSkeleton } from "./components/search-skeleton";

type ResultType = "program" | "setting" | "action";

interface SearchResult {
    id: string;
    title: string;
    path: string;
    href: string;
    type: ResultType;
}

const STATIC_RESULTS: SearchResult[] = [
    { id: "settings-profile", title: "Profile", path: "Settings › Profile", href: "/settings/profile", type: "setting" },
    { id: "settings-billing", title: "Billing & Plans", path: "Settings › Billing & Plans", href: "/settings/billing", type: "setting" },
    { id: "settings-notifications", title: "Notifications", path: "Settings › Notifications", href: "/settings/notifications", type: "setting" },
    { id: "settings-integrations", title: "Integrations", path: "Settings › Integrations", href: "/settings/integrations", type: "setting" },
    { id: "settings-team", title: "Team & Reviewers", path: "Settings › Team & Reviewers", href: "/settings/team", type: "setting" },
    { id: "settings-appearance", title: "Appearance", path: "Settings › Appearance", href: "/settings/appearance", type: "setting" },
    { id: "action-new-cohort", title: "Create New Cohort", path: "Dashboard › New Cohort", href: "/cohorts/new", type: "action" },
    { id: "action-all-programs", title: "View All Programs", path: "Dashboard", href: "/dashboard", type: "action" },
    { id: "action-invite", title: "Invite Reviewers", path: "Settings › Team", href: "/settings/team", type: "action" },
];

const QUICK_ACTIONS: SearchResult[] = [
    { id: "action-new-cohort", title: "Create New Cohort", path: "Start a new program", href: "/cohorts/new", type: "action" },
    { id: "action-all-programs", title: "View Dashboard", path: "See all your cohorts", href: "/dashboard", type: "action" },
    { id: "action-invite", title: "Invite Reviewers", path: "Add team members", href: "/settings/team", type: "action" },
    { id: "settings-appearance", title: "Appearance", path: "Change theme & layout", href: "/settings/appearance", type: "setting" },
];

const SETTING_ICONS: Record<string, React.ElementType> = {
    "settings-profile": Users,
    "settings-billing": CreditCard,
    "settings-notifications": Bell,
    "settings-integrations": Link,
    "settings-team": Users,
    "settings-appearance": Palette,
};

function ResultIcon({ result, size = "md" }: { result: SearchResult; size?: "sm" | "md" }) {
    const cls = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
    if (result.type === "program") return <FileText className={cn(cls, "text-blue-500")} />;
    if (result.type === "action") return <Zap className={cn(cls, "text-amber-500")} />;
    const Icon = SETTING_ICONS[result.id] || Settings;
    return <Icon className={cn(cls, "text-gray-400")} />;
}

export default function SearchPage() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    // Autofocus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Esc to go back
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") router.back();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [router]);

    // Debounced search
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

            setResults([...programMatches, ...staticMatches].slice(0, 15));
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        setActiveIndex(0);
        const timer = setTimeout(() => fetchResults(query), 250);
        return () => clearTimeout(timer);
    }, [query, fetchResults]);

    const allVisible = query.trim() ? results : QUICK_ACTIONS;

    const handleSelect = (href: string) => {
        router.push(href);
    };

    // Keyboard navigation through results
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, allVisible.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (allVisible[activeIndex]) {
                handleSelect(allVisible[activeIndex].href);
            }
        }
    };

    // Group results for display
    const programs = results.filter((r) => r.type === "program");
    const settings = results.filter((r) => r.type === "setting");
    const actions = results.filter((r) => r.type === "action");

    const hasResults = results.length > 0;
    const showIdle = !query.trim();

    // Flat list for keyboard nav index tracking
    const flatResults = query.trim() ? results : QUICK_ACTIONS;

    return (
        <ScalingWrapper className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header bar */}
            <div className="bg-white border-b border-gray-100 h-14 flex items-center px-6 gap-4 shrink-0 shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back</span>
                </button>
                <div className="h-4 w-px bg-gray-200" />
                <span className="text-sm font-bold text-gray-900">Search</span>
                <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Esc</kbd>
                    <span>to exit</span>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-32">
                {/* Search bar */}
                <div className="w-full max-w-2xl">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                        <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm group-focus-within:border-blue-300 group-focus-within:shadow-md transition-all overflow-hidden">
                            <div className="flex items-center">
                                <div className="pl-5 pr-3 shrink-0">
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                    ) : (
                                        <Search className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    )}
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search programs, settings, actions..."
                                    className="flex-1 h-14 text-base text-gray-900 placeholder:text-gray-400 bg-transparent outline-none pr-4"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                {query && (
                                    <button
                                        onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                                        className="pr-4 pl-1 text-gray-400 hover:text-gray-600 transition-colors text-sm"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Results / Idle state */}
                    <div className="mt-6 space-y-6">
                        {showIdle && (
                            <>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Quick Actions</p>
                                    <div className="space-y-1">
                                        {QUICK_ACTIONS.map((item, idx) => (
                                            <ResultRow
                                                key={item.id}
                                                result={item}
                                                isActive={idx === activeIndex}
                                                onSelect={handleSelect}
                                                onHover={() => setActiveIndex(idx)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 px-1 pt-2">
                                    <div className="flex-1 h-px bg-gray-100" />
                                    <p className="text-xs text-gray-400">Start typing to search everything</p>
                                    <div className="flex-1 h-px bg-gray-100" />
                                </div>
                            </>
                        )}

                        {query.trim() && isLoading && (
                            <SearchResultSkeleton />
                        )}

                        {query.trim() && !hasResults && !isLoading && (
                            <div className="text-center py-16 space-y-2">
                                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-gray-900 font-bold">No results for "{query}"</p>
                                <p className="text-sm text-gray-400">Try a different keyword or navigate directly from the sidebar.</p>
                            </div>
                        )}

                        {query.trim() && hasResults && !isLoading && (
                            <>
                                {programs.length > 0 && (
                                    <ResultGroup title="Programs" icon={LayoutDashboard} results={programs} flatResults={flatResults} activeIndex={activeIndex} onSelect={handleSelect} onHover={setActiveIndex} />
                                )}
                                {actions.length > 0 && (
                                    <ResultGroup title="Quick Actions" icon={Zap} results={actions} flatResults={flatResults} activeIndex={activeIndex} onSelect={handleSelect} onHover={setActiveIndex} />
                                )}
                                {settings.length > 0 && (
                                    <ResultGroup title="Settings" icon={Settings} results={settings} flatResults={flatResults} activeIndex={activeIndex} onSelect={handleSelect} onHover={setActiveIndex} />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer hint */}
            <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
                <div className="max-w-2xl mx-auto px-6 pb-6 flex items-center justify-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono shadow-sm text-gray-500">↑</kbd><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono shadow-sm text-gray-500">↓</kbd> Navigate</span>
                    <span className="flex items-center gap-1"><kbd className="px-2 py-0.5 bg-white border border-gray-200 rounded font-mono shadow-sm text-gray-500">↵</kbd> Select</span>
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono shadow-sm text-gray-500">Esc</kbd> Exit</span>
                </div>
            </div>
        </ScalingWrapper>
    );
}

function ResultGroup({
    title,
    icon: Icon,
    results,
    flatResults,
    activeIndex,
    onSelect,
    onHover,
}: {
    title: string;
    icon: React.ElementType;
    results: SearchResult[];
    flatResults: SearchResult[];
    activeIndex: number;
    onSelect: (href: string) => void;
    onHover: (idx: number) => void;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2 px-1">
                <Icon className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
            </div>
            <div className="space-y-1">
                {results.map((result) => {
                    const flatIdx = flatResults.findIndex((r) => r.id === result.id);
                    return (
                        <ResultRow
                            key={result.id}
                            result={result}
                            isActive={flatIdx === activeIndex}
                            onSelect={onSelect}
                            onHover={() => onHover(flatIdx)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function ResultRow({
    result,
    isActive,
    onSelect,
    onHover,
}: {
    result: SearchResult;
    isActive: boolean;
    onSelect: (href: string) => void;
    onHover: () => void;
}) {
    return (
        <button
            onClick={() => onSelect(result.href)}
            onMouseEnter={onHover}
            className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group",
                isActive
                    ? "bg-blue-50 border border-blue-100 shadow-sm"
                    : "bg-white border border-transparent hover:border-gray-100 hover:bg-gray-50/80"
            )}
        >
            <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                isActive ? "bg-white shadow-sm" : "bg-gray-50 group-hover:bg-white"
            )}>
                <ResultIcon result={result} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", isActive ? "text-blue-900" : "text-gray-900")}>
                    {result.title}
                </p>
                <p className={cn("text-xs truncate mt-0.5", isActive ? "text-blue-500" : "text-gray-400")}>
                    {result.path}
                </p>
            </div>
            <ArrowRight className={cn("w-4 h-4 shrink-0 transition-all", isActive ? "text-blue-400 translate-x-0.5" : "text-gray-200 group-hover:text-gray-400")} />
        </button>
    );
}
