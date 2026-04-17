"use client";

import React, { useState, useEffect } from "react";

import {
    Search,
    Settings,
    ChevronDown,
    Plus,
    SquarePen,
    Trash2,
    User,
    LogOut,
    Home,
    Inbox,
    Check,
    BookOpen,
    Rocket,
    MessageSquare,
    Shield,
    PlusCircle,
    Wrench,
    Keyboard,
    MoreHorizontal,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Eye
} from "lucide-react";
import { useHotkeyStore } from "@/hooks/use-hotkey-store";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUniversalSearchStore } from "@/hooks/use-universal-search-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useMemo } from "react";

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    href?: string;
    badge?: number;
    id?: string;
}

const NavItem = ({ icon: Icon, label, isActive, onClick, href: hrefProp, badge, id }: NavItemProps) => {
    const isHome = label === "Home";
    const isSettings = label === "Settings";
    const isInbox = label === "Inbox";
    const href = hrefProp ?? (isHome ? "/home" : isSettings ? "/settings" : isInbox ? "/inbox" : "#");

    const className = cn(
        "flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors group relative cursor-pointer rounded-md",
        isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 font-medium"
    );

    const content = (
        <>
            <Icon className="w-4 h-4" />
            <span className="flex-1 text-left truncate">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-1.5 rounded-sm ml-auto font-medium shadow-sm">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </>
    );

    if (onClick) {
        return (
            <button onClick={onClick} className={className} id={id}>
                {content}
            </button>
        );
    }

    return (
        <Link
            href={href}
            className={className}
            id={id}
        >
            {content}
        </Link>
    );
};

interface CohortItemProps {
    name: string;
    isActive?: boolean;
    onDelete?: () => void;
}

const CohortItem = ({ id, name, isActive, onDelete, href }: CohortItemProps & { id: string, href: string }) => (
    <div
        className={cn(
            "flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors group relative font-medium",
            isActive ? "bg-gray-100 text-gray-900 rounded-md" : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 rounded-md"
        )}
    >
        <Link href={href} className="flex items-center gap-2 flex-1 min-w-0">
            <span className="flex-1 text-left truncate">{name}</span>
        </Link>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity"
                >
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the cohort "{name}" and all of its associated applications and data. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => onDelete?.()}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
);

function SidebarContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeProgramId = searchParams.get('id');
    const [mounted, setMounted] = useState(false);
    const [cohorts, setCohorts] = useState<{ id: string; name: string; active: boolean; status: string; updated_at?: string; created_at?: string }[]>([]);
    const [user, setUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [sortBy, setSortBy] = useState<'manual' | 'recent'>('recent');
    const [limit, setLimit] = useState(10);
    const toggleHotkeyHelp = useHotkeyStore(state => state.toggle);
    const openSettings = useSettingsStore(state => state.openSettings);
    const setSearchOpen = useUniversalSearchStore(state => state.setIsOpen);

    useEffect(() => {
        if (!user) return;

        const fetchUnreadCount = async () => {
            try {
                // Get read items from localStorage
                const storedRead = localStorage.getItem(`cohortly_read_${user.id}`);
                const readSet = new Set<string>(storedRead ? JSON.parse(storedRead) : []);

                // Fetch Apps
                const { data: apps } = await supabase.from('applications').select('id');
                const appIds = (apps || []).map(a => `app_${a.id}`);

                // Fetch Comments
                const { data: comments } = await supabase.from('comments').select('id');
                const commentIds = (comments || []).map(c => `comment_${c.id}`);

                const allIds = [...appIds, ...commentIds];
                const unread = allIds.filter(id => !readSet.has(id)).length;

                setUnreadCount(unread);
            } catch (err) {
                // Silently skip
            }
        };

        fetchUnreadCount();

        // Listen for changes (every few mins or on mount)
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (activeProgramId) {
            localStorage.setItem('lastActiveCohortId', activeProgramId);
        }
    }, [activeProgramId]);

    useEffect(() => {
        setMounted(true);

        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) {
            setCohorts([]);
            return;
        }

        const fetchPrograms = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data, error } = await supabase
                    .from('programs')
                    .select('id, name, status, updated_at, created_at')
                    .order('created_at', { ascending: false });

                if (error) {
                    // Only log if it's not a standard unauthorized error to keep console clean
                    if (error.code !== 'PGRST301' && error.code !== '42501') {
                        console.error('[Sidebar] Error fetching programs:', error.message || error);
                    }
                } else if (data) {
                    const isActionRoute = pathname.startsWith('/cohorts/new') || pathname.startsWith('/admin');
                    const isAllowedBase = ['/home', '/inbox', '/settings', '/search', '/apply', '/docs', '/releases', '/support'].includes(pathname);
                    const isAllowed = isAllowedBase || isActionRoute;

                    // Force redirect to home if no cohorts are created, but ONLY for dashboard-related views
                    // We allow all other pages to remain accessible even if empty
                    if (data.length === 0 && !isAllowed) {
                        console.log("[Sidebar] No cohorts found and path not allowed. Redirecting to /home from:", pathname);
                        router.replace('/home');
                        return;
                    }

                    setCohorts(data.map(p => ({
                        id: p.id,
                        name: p.name,
                        status: p.status,
                        updated_at: p.updated_at,
                        created_at: p.created_at,
                        active: p.id === activeProgramId
                    })));
                }
            } catch (err: any) {
                // Silently handle exceptions in background fetch
            }
        };

        fetchPrograms();

        const channel = supabase
            .channel('programs-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'programs' },
                () => fetchPrograms()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeProgramId, pathname]);

    const handleDeleteCohort = async (id: string) => {
        try {
            const { error } = await supabase
                .from('programs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success("Program deleted");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete program");
        }
    };

    const handleMoveUp = () => {
        if (!activeProgramId) return;
        const index = cohorts.findIndex(c => c.id === activeProgramId);
        if (index > 0) {
            const newCohorts = [...cohorts];
            [newCohorts[index], newCohorts[index - 1]] = [newCohorts[index - 1], newCohorts[index]];
            setCohorts(newCohorts);
            setSortBy('manual');
        }
    };

    const handleMoveDown = () => {
        if (!activeProgramId) return;
        const index = cohorts.findIndex(c => c.id === activeProgramId);
        if (index < cohorts.length - 1) {
            const newCohorts = [...cohorts];
            [newCohorts[index], newCohorts[index + 1]] = [newCohorts[index + 1], newCohorts[index]];
            setCohorts(newCohorts);
            setSortBy('manual');
        }
    };

    const sortedCohorts = useMemo(() => {
        let list = [...cohorts];
        if (sortBy === 'recent') {
            list.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
        }
        return list.slice(0, limit);
    }, [cohorts, sortBy, limit]);

    const userEmail = user?.email ?? "guest@cohortly.com";
    const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? "Guest User";
    const initials = userName.split(' ').map((n: string) => (n?.[0] || '')).join('').toUpperCase().slice(0, 2);

    return (
        <aside className="w-[240px] h-full bg-gray-50/50 flex flex-col border-r border-gray-200 select-none">
            <div className="p-4 flex-none flex items-center justify-between gap-2">
                <Link
                    href="/home"
                    className="flex items-center gap-2 p-1 hover:bg-gray-100/50 rounded transition-colors group text-gray-900 min-w-0 mr-auto"
                >
                    <div className="w-5 h-5 relative flex items-center justify-center shrink-0">
                        <Image
                            src="/logo.svg"
                            alt="Cohortly"
                            width={20}
                            height={20}
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <span className="font-bold text-sm truncate">Cohortly</span>
                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                </Link>
            </div>


            <div className="flex flex-col py-1 flex-none space-y-0.5 px-3">
                <NavItem icon={Search} label="Search" id="sidebar-search" onClick={() => setSearchOpen(true)} />
                <NavItem icon={Home} label="Home" id="sidebar-home" isActive={pathname === "/home"} />
                <NavItem icon={Inbox} label="Inbox" id="sidebar-inbox" isActive={pathname === "/inbox"} badge={unreadCount} />
                <NavItem icon={Settings} label="Settings" id="sidebar-settings" onClick={() => openSettings()} />
            </div>

            <div className="flex flex-col flex-1 mt-6 overflow-hidden min-h-0">
                <ScrollArea className="flex-1 h-full">
                    <div className="flex flex-col pb-4 space-y-6">
                        {/* Published Cohorts Section */}
                        <div className="flex flex-col space-y-0.5">
                            <div className="flex items-center justify-between px-5 mb-2 group" id="sidebar-cohorts">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Cohorts
                                </span>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        href="/cohorts/new"
                                        className="p-0.5 hover:bg-gray-100 rounded"
                                    >
                                        <Plus className="w-4 h-4 text-gray-400 font-bold" />
                                    </Link>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-0.5 hover:bg-gray-100 rounded">
                                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent side="right" align="start" className="w-56">
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <ArrowUpDown className="mr-2 h-4 w-4" />
                                                    <span>Sort</span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent>
                                                        <DropdownMenuItem onClick={() => setSortBy('manual')}>
                                                            Manual
                                                            {sortBy === 'manual' && <Check className="ml-auto h-4 w-4" />}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setSortBy('recent')}>
                                                            Last edited
                                                            {sortBy === 'recent' && <Check className="ml-auto h-4 w-4" />}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    <span>Show</span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent>
                                                        {[5, 10, 25, 50, 100].map(val => (
                                                            <DropdownMenuItem key={val} onClick={() => setLimit(val)}>
                                                                {val}
                                                                {limit === val && <Check className="ml-auto h-4 w-4" />}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={handleMoveUp} disabled={!activeProgramId}>
                                                <ArrowUp className="mr-2 h-4 w-4" />
                                                <span>Move up</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleMoveDown} disabled={!activeProgramId}>
                                                <ArrowDown className="mr-2 h-4 w-4" />
                                                <span>Move down</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <div className="px-3 space-y-0.5">
                                {sortedCohorts.filter(c => c.status === 'published').map((cohort) => (
                                    <CohortItem
                                        key={cohort.id}
                                        id={cohort.id}
                                        name={cohort.name}
                                        isActive={cohort.active}
                                        onDelete={() => handleDeleteCohort(cohort.id)}
                                        href={`/dashboard?id=${cohort.id}`}
                                    />
                                ))}
                                {cohorts.filter(c => c.status === 'published').length === 0 && (
                                    <Link 
                                        href="/cohorts/new"
                                        id="sidebar-new-cohort"
                                        className="flex items-center gap-2 w-full px-3 py-1 text-[13px] text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 font-medium transition-colors rounded-md group"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span className="flex-1 text-left truncate">New Cohort</span>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Drafts Section */}
                        <div className="flex flex-col space-y-0.5">
                            <div className="flex items-center justify-between px-5 mb-2 group" id="sidebar-drafts">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Drafts
                                </span>
                            </div>
                            <div className="px-3 space-y-0.5">
                                {sortedCohorts.filter(c => c.status === 'draft').map((cohort) => (
                                    <CohortItem
                                        key={cohort.id}
                                        id={cohort.id}
                                        name={cohort.name}
                                        isActive={cohort.active}
                                        onDelete={() => handleDeleteCohort(cohort.id)}
                                        href={`/cohorts/new?edit=${cohort.id}`}
                                    />
                                ))}
                                {cohorts.filter(c => c.status === 'draft').length === 0 && (
                                    <div className="px-2 py-4">
                                        <p className="text-[11px] text-gray-400 italic text-center">No drafts</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Bottom Section */}
            <div className="flex-none py-2.5 px-3 flex items-center justify-between">
                {mounted ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Avatar className="w-7 h-7 cursor-pointer hover:ring-2 hover:ring-gray-100 transition-all shrink-0 border-2 border-white shadow-sm">
                                <AvatarImage src={user?.user_metadata?.avatar_url} />
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-[9px] font-bold">{initials}</AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="end" className="w-56 mb-2">
                            <DropdownMenuLabel>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold truncate">{userName}</span>
                                    <span className="text-xs text-gray-400 font-normal truncate">{userEmail}</span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openSettings()}>
                                <User className="mr-2 h-4 w-4" />
                                Account Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={handleSignOut}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white shadow-sm shrink-0" />
                )}

                <div className="flex items-center gap-0.5">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <DropdownMenu>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            id="sidebar-resources"
                                            className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100/50 transition-colors"
                                        >
                                            <Wrench className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <DropdownMenuContent side="top" align="start" className="w-52 mb-2 px-1">
                                    <DropdownMenuItem className="gap-2 cursor-pointer" asChild>
                                        <a href="https://getcohortly.vercel.app/docs" target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                                            <BookOpen className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">Documentation</span>
                                        </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer" asChild>
                                        <a href="https://getcohortly.vercel.app/releases" target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                                            <Rocket className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">Releases</span>
                                        </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer" asChild>
                                        <a href="https://getcohortly.vercel.app/support" target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                                            <MessageSquare className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">Support</span>
                                        </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="gap-2 cursor-pointer" asChild>
                                        <a href="https://getcohortly.vercel.app/terms-privacy" target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                                            <Shield className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">Terms & Privacy</span>
                                        </a>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <TooltipContent side="top" className="text-[11px] font-medium px-2 py-1">
                                Resources
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100/50 transition-colors"
                                    onClick={toggleHotkeyHelp}
                                >
                                    <Keyboard className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[11px] font-medium px-2 py-1">
                                Keyboard Shortcuts (Shift+?)
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </aside>
    );

    async function handleSignOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Signed out successfully");
            router.push("/login");
        }
    }
}

export function Sidebar() {
    return (
        <React.Suspense fallback={<div className="w-[240px] h-full bg-gray-50/50 border-r border-gray-200" />}>
            <SidebarContent />
        </React.Suspense>
    );
}
