"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    User,
    CreditCard,
    Bell,
    Plug,
    Users,
    Palette,
    AlertTriangle,
    Upload,
    X,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores/settingsStore";
import { supabase } from "@/lib/supabase/client";
import { ProfileSettings } from "./profile-settings";
import { AppearanceSettings } from "./appearance-settings";
import { BillingSettings } from "./billing-settings";
import { NotificationSettings } from "./notification-settings";
import { IntegrationsSettings } from "./integrations-settings";
import { TeamSettings } from "./team-settings";
import { DangerSettings } from "./danger-settings";
import { ImportSettings } from "./import-settings";
import { fetchBillingSnapshotAction } from "@/app/actions/billing-actions";
import type { BillingSnapshot } from "@/lib/billing/snapshot";

export function SettingsModal() {
    const { 
        isSettingsModalOpen, 
        closeSettings, 
        activeSettingsTab, 
        setSettingsTab,
    } = useSettingsStore();

    const [mounted, setMounted] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
    const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);

    useEffect(() => {
        setMounted(true);
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (profile) {
                    setUserProfile({ ...user, profile });
                } else {
                    setUserProfile(user);
                }
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (activeSettingsTab === 'billing' && !snapshot) {
            setIsLoadingSnapshot(true);
            fetchBillingSnapshotAction().then((res) => {
                if (res.snapshot) {
                    setSnapshot(res.snapshot);
                }
                setIsLoadingSnapshot(false);
            });
        }
    }, [activeSettingsTab, snapshot]);

    if (!mounted) return null;

    const sidebarItems = [
        {
            id: "general",
            title: "General",
            icon: User,
        },
        {
            id: "preferences",
            title: "Preferences",
            icon: Palette,
        },
        {
            id: "notifications",
            title: "Notifications",
            icon: Bell,
        },
        {
            id: "integrations",
            title: "Integrations",
            icon: Plug,
        },
        {
            id: "import",
            title: "Import",
            icon: Upload,
        },
        {
            id: "team",
            title: "Team & Reviewers",
            icon: Users,
        },
        {
            id: "billing",
            title: "Billing & Plans",
            icon: CreditCard,
        },
    ];

    const renderContent = () => {
        switch (activeSettingsTab) {
            case 'general':
                return (
                    <div className="space-y-12">
                        <ProfileSettings />
                        <DangerSettings />
                    </div>
                );
            case 'preferences':
                return <AppearanceSettings />;
            case 'notifications':
                return <NotificationSettings />;
            case 'integrations':
                return <IntegrationsSettings />;
            case 'import':
                return <ImportSettings />;
            case 'team':
                return <TeamSettings />;
            case 'billing':
                if (isLoadingSnapshot || !snapshot) {
                    return (
                        <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin mb-2" />
                            <p className="text-sm">Loading billing details...</p>
                        </div>
                    );
                }
                return <BillingSettings snapshot={snapshot} />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                        <p className="text-sm italic">This section is under construction</p>
                    </div>
                );
        }
    };

    return (
        <Dialog open={isSettingsModalOpen} onOpenChange={(open) => !open && closeSettings()}>
        <DialogContent 
                className="sm:max-w-[90vw] h-[90vh] p-0 overflow-hidden flex flex-col rounded-xl border border-gray-100 shadow-sm/5"
                wrapperClassName="p-0 h-full flex flex-col"
                showCloseButton={false}
            >
                <DialogTitle className="sr-only">Settings</DialogTitle>
                <DialogDescription className="sr-only">
                    Manage your account settings, team, and billing preferences.
                </DialogDescription>
                
                <div className="flex-1 flex min-h-0 overflow-hidden bg-white">
                    {/* Settings Sidebar */}
                    <aside className="w-[240px] shrink-0 border-r border-gray-200 bg-gray-50/20 flex flex-col relative pb-4">
                        <div className="px-4 pt-4 pb-2 flex flex-col gap-2">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 pt-2">Account</h2>
                            
                            {userProfile && (
                                <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={userProfile.profile?.avatar_url || userProfile.user_metadata?.avatar_url} />
                                        <AvatarFallback className="text-[9px] font-bold bg-gray-200 text-gray-600">
                                            {(userProfile.profile?.full_name || userProfile.user_metadata?.full_name || userProfile.email || "?").charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[13px] font-medium text-gray-700 truncate flex-1 text-left">
                                        {userProfile.profile?.full_name || userProfile.user_metadata?.full_name || "User"}
                                    </span>
                                </div>
                            )}
                        </div>

                        <nav className="flex-1 space-y-1 px-4 overflow-y-auto">
                            {sidebarItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setSettingsTab(item.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-all relative group",
                                        activeSettingsTab === item.id
                                            ? "bg-gray-100 text-gray-900"
                                            : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "w-4 h-4 shrink-0 transition-colors text-gray-400 group-hover:text-gray-600",
                                        activeSettingsTab === item.id && "text-gray-900"
                                    )} />
                                    <span>{item.title}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Content Area */}
                    <main className="flex-1 flex flex-col min-w-0 bg-white relative">
                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 z-50 rounded-full"
                            onClick={closeSettings}
                        >
                            <X className="w-4 h-4" />
                        </Button>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
                            <div className="max-w-4xl mx-auto">
                                {renderContent()}
                            </div>
                        </div>
                    </main>
                </div>
            </DialogContent>
        </Dialog>
    );
}
