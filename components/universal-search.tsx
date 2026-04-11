"use client";

import * as React from "react";
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem
} from "@/components/ui/command";
import { useUniversalSearch } from "@/hooks/use-universal-search";
import { FileText, Settings, Zap, Type, User, Folder, Plus, ChevronDown, Monitor, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function UniversalSearch() {
    const { isOpen, setIsOpen, query, setQuery, results, onSelect } = useUniversalSearch();

    return (
        <CommandDialog
            open={isOpen}
            onOpenChange={setIsOpen}
            showCloseButton={false}
            className="fixed top-[18vh] left-1/2 -translate-x-1/2 translate-y-0 h-[85vh] min-h-[85vh] sm:max-w-2xl rounded-t-2xl shadow-2xl overflow-hidden border-none"
            overlayClassName="backdrop-blur-none bg-black/5"
            wrapperClassName="p-0"
        >
            <CommandInput
                placeholder="Let's find what you're looking for..."
                value={query}
                onValueChange={setQuery}
                className="h-14 text-base px-5 border-none"
            />

            {/* Quick Actions Bar (Compact & Neutral) */}
            <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-gray-100 overflow-x-auto">
                <button
                    onClick={() => onSelect('/cohorts/new')}
                    className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 text-[11px] font-semibold text-gray-500 transition-colors whitespace-nowrap"
                >
                    <Plus className="h-3 w-3" />
                    <span>New Cohort</span>
                </button>
                <button
                    onClick={() => onSelect('settings:team')}
                    className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 text-[11px] font-semibold text-gray-500 transition-colors whitespace-nowrap"
                >
                    <User className="h-3 w-3" />
                    <span>Invite Team</span>
                </button>
                <button
                    onClick={() => onSelect('settings:billing')}
                    className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 text-[11px] font-semibold text-gray-500 transition-colors whitespace-nowrap"
                >
                    <Settings className="h-3 w-3" />
                    <span>Manage Billing</span>
                </button>
                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        esc
                    </div>
                </div>
            </div>
            <CommandList className="flex-1 overflow-y-auto">
                <CommandEmpty className="py-20 text-center text-sm text-gray-400">
                    No results found for "{query}"
                </CommandEmpty>
                {results.length > 0 && (
                    <div className="pb-40">
                        {/* Programs Group */}
                        {results.filter(r => r.type === 'program').length > 0 && (
                            <CommandGroup heading="Programs" className="px-1.5 pt-4">
                                {results.filter(r => r.type === 'program').map((result) => (
                                    <ResultItem key={result.id} result={result} onSelect={onSelect} />
                                ))}
                            </CommandGroup>
                        )}

                        {/* Settings Group */}
                        {results.filter(r => r.type === 'setting').length > 0 && (
                            <CommandGroup heading="Settings" className="px-1.5 pt-4">
                                {results.filter(r => r.type === 'setting').map((result) => (
                                    <ResultItem key={result.id} result={result} onSelect={onSelect} />
                                ))}
                            </CommandGroup>
                        )}

                        {/* Actions Group */}
                        {results.filter(r => r.type === 'action').length > 0 && (
                            <CommandGroup heading="Quick Actions" className="px-1.5 pt-4">
                                {results.filter(r => r.type === 'action').map((result) => (
                                    <ResultItem key={result.id} result={result} onSelect={onSelect} />
                                ))}
                            </CommandGroup>
                        )}
                    </div>
                )}
            </CommandList>
        </CommandDialog>
    );
}

function ResultItem({ result, onSelect }: { result: any, onSelect: (href: string) => void }) {
    return (
        <CommandItem
            value={`${result.title} ${result.path}`}
            onSelect={() => onSelect(result.href)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer aria-selected:bg-gray-100/80 transition-all group/item mb-0.5"
        >
            <div className="shrink-0">
                {result.type === 'program' && <FileText className="h-4 w-4 text-blue-500 opacity-80" />}
                {result.type === 'setting' && <Settings className="h-4 w-4 text-gray-400 opacity-80" />}
                {result.type === 'action' && <Zap className="h-4 w-4 text-amber-500 opacity-80" />}
            </div>
            <div className="flex items-center flex-1 min-w-0 gap-2">
                <span className="text-[13px] font-semibold text-gray-900 truncate">
                    {result.title}
                </span>
                <span className="text-[11px] text-gray-400 truncate font-medium">
                    {result.path}
                </span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
                <span className="text-[10px] text-gray-400 font-medium tabular-nums group-aria-selected/item:hidden">
                    {result.type === 'program' ? 'Apr 2' : 'Action'}
                </span>
                <CornerDownLeft className="h-3 w-3 text-gray-400 opacity-0 group-aria-selected/item:opacity-100 transition-opacity" />
            </div>
        </CommandItem>
    );
}
