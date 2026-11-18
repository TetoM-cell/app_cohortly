"use client";

/**
 * Settings & Launch Component
 * Refined with functional reviewer invitations and premium UI.
 */
import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
    Mail,
    Copy,
    UserPlus,
    MoreHorizontal,
    Share2,
    Smartphone,
    MessageSquare,
    Link as LinkIcon,
    X,
    ChevronDown,
    Settings,
    User,
    ArrowRight,
    Trash2,
    CheckCircle,
    Zap,
    Plus,
    ExternalLink,
    AlertCircle,
    Info,
    Terminal,
    AlertTriangle,
    Loader2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/reui/badge";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { LaunchProgressStepper } from "./launch-progress-stepper";
import { RocketIcon as AnimatedRocketIcon } from "@animateicons/react/lucide";

interface SettingsLaunchProps {
    onNext: () => void;
    onBack: () => void;
    onSave?: () => Promise<void>;
    cohortName: string;
    steps?: { title: string; id: number }[];
    currentStep?: number;
    loading?: boolean;
    reviewers: { email: string; role: string; status: string }[];
    setReviewers: React.Dispatch<React.SetStateAction<{ email: string; role: string; status: string }[]>>;
    programId: string | null;
    cohortData: any;
    setCohortData: (data: any) => void;
}

type AnimatedIconHandle = {
    startAnimation: () => void;
    stopAnimation: () => void;
};

export function SettingsLaunch({ onNext, cohortName, loading = false, reviewers, setReviewers, programId, cohortData, setCohortData }: SettingsLaunchProps) {
    const [emailInput, setEmailInput] = useState("");
    const [pendingInvites, setPendingInvites] = useState<{ email: string; role: string }[]>([]);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
    const [notifications, setNotifications] = useState({
        emailEvents: ["New submission"],
    });
    const [launchSettings, setLaunchSettings] = useState({
        allowReferrals: true,
        customSlug: (cohortName || "new-program").toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        seoTitle: cohortName || "New Program",
        seoDescription: "Apply now for our upcoming program."
    });
    const rocketIconRef = useRef<AnimatedIconHandle | null>(null);
    const handleLaunch = () => {
        onNext();
    };

    const addReviewerChip = async () => {
        if (!emailInput || !emailInput.includes("@")) return;
        if (pendingInvites.some(p => p.email === emailInput)) return;

        // Prevent duplicates for current reviewers
        if (reviewers.some(r => r.email.toLowerCase() === emailInput.toLowerCase())) {
            setToast({ message: "User is already a reviewer for this cohort.", visible: true });
            setTimeout(() => setToast({ message: "", visible: false }), 3000);
            return;
        }

        try {
            // Check if user exists in Cohortly profiles
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', emailInput)
                .maybeSingle();

            if (error) throw error;

            if (!profile) {
                setToast({ message: "User not found. Reviewers must already be signed in to Cohortly.", visible: true });
                setTimeout(() => setToast({ message: "", visible: false }), 3000);
                return;
            }

            // Check if there's already a pending invitation in notifications
            if (programId) {
                const { data: existingInvite } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('recipient_id', profile.id)
                    .eq('type', 'invitation')
                    .eq('status', 'active')
                    .contains('metadata', { program_id: programId })
                    .maybeSingle();

                if (existingInvite) {
                    setToast({ message: "An invitation for this user is already pending.", visible: true });
                    setTimeout(() => setToast({ message: "", visible: false }), 3000);
                    return;
                }
            }

            setPendingInvites([...pendingInvites, { email: emailInput, role: "Reviewer" }]);
            setEmailInput("");
        } catch (err) {
            console.error("Error checking user:", err);
            setToast({ message: "Failed to verify user. Please try again.", visible: true });
            setTimeout(() => setToast({ message: "", visible: false }), 3000);
        }
    };

    const removePendingInvite = (index: number) => {
        setPendingInvites(pendingInvites.filter((_, i) => i !== index));
    };

    const updatePendingRole = (index: number, role: string) => {
        const newInvites = [...pendingInvites];
        newInvites[index].role = role;
        setPendingInvites(newInvites);
    };

    const updateReviewerRole = (email: string, role: string) => {
        setReviewers(reviewers.map(r => r.email === email ? { ...r, role } : r));
    };

    const removeReviewer = (email: string) => {
        setReviewers(reviewers.filter(r => r.email !== email));
    };

    const sendInvites = async () => {
        if (pendingInvites.length === 0) return;
        if (!programId) {
            setToast({ message: "Please save draft or wait for cohort initialization.", visible: true });
            setTimeout(() => setToast({ message: "", visible: false }), 3000);
            return;
        }

        setToast({ message: "Sending invitations...", visible: true });

        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();

            for (const invite of pendingInvites) {
                // 1. Get recipient profile ID again to be safe
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', invite.email)
                    .single();

                if (profile) {
                    // 2. Create notification
                    const { error: inviteError } = await supabase
                        .from('notifications')
                        .insert({
                            recipient_id: profile.id,
                            type: 'invitation',
                            title: 'New Reviewer Invitation',
                            message: `You have been invited to review applications for ${cohortName}.`,
                            metadata: {
                                program_id: programId,
                                role: invite.role.toLowerCase(),
                                inviter_email: currentUser?.email,
                                cohort_name: cohortName
                            }
                        });

                    if (inviteError) throw inviteError;
                }
            }

            const newReviewers = pendingInvites.map((p) => ({
                email: p.email,
                role: p.role,
                status: "Sent"
            }));

            setReviewers([...reviewers, ...newReviewers]);
            setPendingInvites([]);

            setToast({ message: "Invitations sent! Reviewers will appear in the dashboard upon acceptance.", visible: true });
        } catch (err) {
            console.error("Error sending invites:", err);
            setToast({ message: "Failed to send some invitations.", visible: true });
        } finally {
            setTimeout(() => setToast({ message: "", visible: false }), 3000);
        }
    };

    const toggleEmailEvent = (event: string) => {
        setNotifications(prev => ({
            ...prev,
            emailEvents: prev.emailEvents.includes(event)
                ? prev.emailEvents.filter(e => e !== event)
                : [...prev.emailEvents, event]
        }));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setToast({ message: "Copied to clipboard!", visible: true });
        setTimeout(() => setToast({ message: "", visible: false }), 3000);
    };

    return (
        <div className="min-h-screen bg-background pb-32">
            <div className="max-w-5xl mx-auto px-8 py-12 space-y-6">
                <div>
                    <h1 className="font-playfair text-3xl font-semibold tracking-tight text-gray-900 mb-2">
                        Settings & Launch
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 max-w-2xl leading-relaxed">
                        Your program is almost ready. Invite reviewers, connect notifications, and open applications.
                    </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Invite reviewers</h2>
                                <p className="text-sm text-gray-500 mt-1">Add team members who can view, score, and comment on applications.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-xl group transition-all">
                                <div className="pl-3 text-gray-400">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <Input
                                    placeholder="Enter email to invite..."
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addReviewerChip()}
                                />
                                <Button
                                    onClick={addReviewerChip}
                                >
                                    Add reviewer
                                </Button>
                            </div>

                            <p className="flex w-fit items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                                <AlertTriangle className="h-3 w-3" />
                                Important: Reviewers must already be signed into Cohortly.
                            </p>

                            <AnimatePresence>
                                {pendingInvites.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {pendingInvites.map((invite, index) => (
                                            <motion.div
                                                key={invite.email}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-white border border-gray-200 rounded-full hover:border-gray-300 transition-all group"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-500">
                                                    {invite.email.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{invite.email}</span>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded-full text-[11px] font-bold text-gray-500 hover:bg-gray-100 transition-colors uppercase tracking-tight">
                                                            {invite.role}
                                                            <ChevronDown className="w-3 h-3" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-lg border-gray-200 p-1">
                                                        {["Admin", "Reviewer", "View-only"].map((role) => (
                                                            <DropdownMenuItem
                                                                key={role}
                                                                onClick={() => updatePendingRole(index, role)}
                                                                className="rounded-md text-sm cursor-pointer"
                                                            >
                                                                {role}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                <button
                                                    onClick={() => removePendingInvite(index)}
                                                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex flex-wrap gap-3 p-4 bg-gray-50/30 rounded-xl border border-dashed border-gray-200 min-h-[100px] items-center justify-center">
                            {reviewers.length === 0 && pendingInvites.length === 0 ? (
                                <div className="text-center py-4">
                                    <p className="text-sm text-gray-400">Add team members above to see them here.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Already Added/Sent Reviewers */}
                                    {reviewers.map((rev, idx) => (
                                        <motion.div
                                            key={`rev-${rev.email}`}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-gray-200 rounded-full"
                                        >
                                            <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-[10px] font-bold text-emerald-600">
                                                {rev.email.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">{rev.email}</span>
                                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 uppercase">
                                                {rev.role}
                                            </span>
                                            <button
                                                onClick={() => removeReviewer(rev.email)}
                                                className="p-1 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </motion.div>
                                    ))}

                                    {/* Pending (To be Sent) Reviewers */}
                                    {pendingInvites.map((invite, index) => (
                                        <motion.div
                                            key={`pending-${invite.email}`}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-blue-50/50 border border-blue-100 rounded-full"
                                        >
                                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                {invite.email.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-blue-700">{invite.email}</span>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-100 rounded-full text-[10px] font-bold text-blue-500 hover:bg-blue-100 transition-colors uppercase">
                                                        {invite.role}
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-lg">
                                                    {["Admin", "Reviewer", "View-only"].map((role) => (
                                                        <DropdownMenuItem
                                                            key={role}
                                                            onClick={() => updatePendingRole(index, role)}
                                                        >
                                                            {role}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <button
                                                onClick={() => removePendingInvite(index)}
                                                className="p-1 text-blue-200 hover:text-red-500 transition-all"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </>
                            )}
                        </div>

                        <div className="pt-4 mt-4">
                            <div className="flex justify-end">
                                <Button
                                    onClick={sendInvites}
                                    disabled={pendingInvites.length === 0}
                                >
                                    Confirm Reviewers
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                            <p className="text-sm text-gray-500 mt-1">Get alerted when new applications arrive.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-4">
                                <div className="mb-3">
                                    <p className="font-bold text-gray-900">Email Alerts</p>
                                    <Badge variant={notifications.emailEvents.length > 0 ? "success-light" : "destructive"}>
                                        {notifications.emailEvents.length > 0 ? "ACTIVE" : "INACTIVE"}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed pr-4">
                                    Configure which events trigger an automated email to program admins.
                                </p>
                            </div>
                            <div className="lg:col-span-8 bg-gray-50/50 rounded-xl border border-gray-200 p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {["New submission", "Auto-shortlist", "Auto-reject", "Comment added"].map((event) => (
                                        <button
                                            key={event}
                                            onClick={() => toggleEmailEvent(event)}
                                            className={cn(
                                                "flex items-center justify-between p-2.5 rounded-lg border transition-all text-sm font-medium",
                                                notifications.emailEvents.includes(event)
                                                    ? "bg-white border-black text-black"
                                                    : "bg-white/50 border-gray-200 text-gray-400 hover:border-gray-300"
                                            )}
                                        >
                                            {event}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Launch Settings</h2>
                            <p className="text-sm text-gray-500 mt-1">Configure your public application presence.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                custom landing page URL
                            </label>
                            <InputGroup className="has-[[data-slot=input-group-control]:focus-visible]:ring-0">
                                <InputGroupAddon>
                                    <InputGroupText>cohortly.com/apply/</InputGroupText>
                                </InputGroupAddon>
                                <InputGroupInput
                                    value={launchSettings.customSlug}
                                    onChange={(e) => setLaunchSettings({ ...launchSettings, customSlug: e.target.value })}
                                />
                            </InputGroup>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                    SEO title
                                </label>
                                <Input
                                    value={launchSettings.seoTitle}
                                    onChange={(e) => setLaunchSettings({ ...launchSettings, seoTitle: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                    SEO description
                                </label>
                                <Input
                                    value={launchSettings.seoDescription}
                                    onChange={(e) => setLaunchSettings({ ...launchSettings, seoDescription: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Contact & Support</h2>
                            <p className="text-sm text-gray-500 mt-1">Provide contact information for your applicants.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-3">
                            <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                support email address
                            </label>
                            <div>
                                <Input
                                    type="email"
                                    placeholder="e.g. cohortlyapp@gmail.com"
                                    value={cohortData.contactEmail}
                                    onChange={(e) => setCohortData({ ...cohortData, contactEmail: e.target.value })}
                                />
                            </div>
                            <p className="text-xs text-gray-500">This email will be visible on the application form and in success messages.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-black rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-full text-left space-y-12">
                            <div className="space-y-4">
                                <h2 className="font-playfair text-3xl font-semibold tracking-tight">Ready to launch?</h2>
                                <p className="text-xl text-gray-400 font-medium">Your program is fully configured and optimized for success.</p>
                            </div>

                            <LaunchProgressStepper completedSteps={4} />

                            <div className="w-full space-y-4 text-left">
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Your unique program URL</p>
                                    <div className="flex w-full min-w-0 items-center justify-start gap-2 overflow-hidden truncate rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base font-bold">
                                        <span className="truncate opacity-40 font-medium">cohortly.app/apply/</span>
                                        <span className="truncate text-white">{launchSettings.customSlug}</span>
                                        <button
                                            onClick={() => copyToClipboard(`https://cohortly.app/apply/${launchSettings.customSlug}`)}
                                            className="ml-auto shrink-0 rounded-lg p-1 transition-all hover:bg-white/10"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        size="lg"
                                        onClick={handleLaunch}
                                        disabled={loading}
                                        className="bg-white text-black hover:bg-white/90"
                                        onMouseEnter={() => rocketIconRef.current?.startAnimation()}
                                        onMouseLeave={() => rocketIconRef.current?.stopAnimation()}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Launching...
                                            </>
                                        ) : (
                                            <>
                                                Open Applications
                                                <AnimatedRocketIcon ref={rocketIconRef} className="size-5" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <AnimatePresence>
                        {toast.visible && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-full flex items-center gap-3 border border-gray-800"
                            >
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <span className="text-sm font-medium">{toast.message}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
