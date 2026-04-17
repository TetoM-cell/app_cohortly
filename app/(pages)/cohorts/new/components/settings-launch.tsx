"use client";

/**
 * Settings & Launch Component
 * Refined with functional reviewer invitations and premium UI.
 */
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    Users,
    Bell,
    Rocket,
    Mail,
    Slack,
    Globe,
    Copy,
    Check,
    UserPlus,
    MoreHorizontal,
    QrCode,
    Share2,
    Shield,
    Smartphone,
    MessageSquare,
    Link as LinkIcon,
    X,
    ChevronDown,
    Eye,
    Settings,
    User,
    ArrowRight,
    Trash2,
    CheckCircle,
    CheckCircle2,
    Zap,
    Plus,
    ExternalLink,
    AlertCircle,
    Info,
    Twitter,
    Linkedin,
    Code,
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
import { WizardProgress } from "./wizard-progress";
import { SaveAndExit } from "./save-and-exit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";

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

export function SettingsLaunch({ onNext, onBack, onSave, cohortName, steps, currentStep = 4, loading = false, reviewers, setReviewers, programId, cohortData, setCohortData }: SettingsLaunchProps) {
    const [emailInput, setEmailInput] = useState("");
    const [pendingInvites, setPendingInvites] = useState<{ email: string; role: string }[]>([]);
    const [anonymousMode, setAnonymousMode] = useState(false);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
    const [notifications, setNotifications] = useState({
        slackUrl: "",
        slackConnected: false,
        emailEvents: ["New submission"],
    });
    const [launchSettings, setLaunchSettings] = useState({
        publicStatus: true,
        allowReferrals: true,
        customSlug: (cohortName || "new-program").toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        seoTitle: cohortName || "New Program",
        seoDescription: "Apply now for our upcoming program."
    });
    const [copied, setCopied] = useState(false);
    const [isFetchingSlack, setIsFetchingSlack] = useState(true);
    const [isSavingSlack, setIsSavingSlack] = useState(false);
    const [readiness] = useState({
        formComplete: true,
        rubricWeights: true,
        reviewersAdded: true
    });

    // Pre-fetch saved Slack webhook from user_settings
    useEffect(() => {
        const fetchSlackWebhook = async () => {
            setIsFetchingSlack(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('slack_webhook_url')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (settings?.slack_webhook_url) {
                    setNotifications(prev => ({
                        ...prev,
                        slackUrl: settings.slack_webhook_url,
                        slackConnected: true
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch Slack settings:', err);
            } finally {
                setIsFetchingSlack(false);
            }
        };
        fetchSlackWebhook();
    }, []);
    const embedCode = `<iframe src="https://cohortly.app/embed/${launchSettings.customSlug}" width="100%" height="600px" frameborder="0"></iframe>`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`cohortly.com/apply/${launchSettings.customSlug}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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

    const handleSlackConnect = async () => {
        if (!notifications.slackUrl.startsWith("https://hooks.slack.com")) {
            setToast({ message: "Invalid Slack Webhook URL", visible: true });
            setTimeout(() => setToast({ message: "", visible: false }), 3000);
            return;
        }

        setIsSavingSlack(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('user_settings')
                    .upsert({
                        user_id: user.id,
                        slack_webhook_url: notifications.slackUrl,
                        updated_at: new Date().toISOString()
                    });
            }
            setNotifications(prev => ({ ...prev, slackConnected: true }));
            setToast({ message: "Slack connected and saved!", visible: true });
        } catch (err) {
            console.error('Failed to save Slack webhook:', err);
            setToast({ message: "Failed to save Slack settings", visible: true });
        } finally {
            setIsSavingSlack(false);
            setTimeout(() => setToast({ message: "", visible: false }), 3000);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setToast({ message: "Copied to clipboard!", visible: true });
        setTimeout(() => setToast({ message: "", visible: false }), 3000);
    };

    return (
        <div className="min-h-screen bg-[#FBFCFD] pb-32">
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-8 py-8">
                    <div className="flex items-start justify-between gap-12 mb-8">
                        {steps && (
                            <div className="flex-1 max-w-2xl">
                                <WizardProgress currentStep={currentStep} steps={steps} className="mb-0" />
                            </div>
                        )}
                        <div className="shrink-0">
                            <SaveAndExit onSave={onSave} />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Settings & Launch
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
                        Your program is almost ready. Invite reviewers, connect notifications, and open applications.
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-12 space-y-8">
                <div className="bg-white border border-gray-200 rounded-xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 rounded-lg">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Invite reviewers</h2>
                                <p className="text-sm text-gray-500 mt-1">Add team members who can view, score, and comment on applications.</p>
                                <p className="text-[11px] font-bold text-amber-600 mt-2 flex items-center gap-1.5 bg-amber-50 w-fit px-2 py-0.5 rounded-full border border-amber-100">
                                    <AlertTriangle className="w-3 h-3" />
                                    Important: Reviewers must already be signed into Cohortly.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-xl border border-gray-200 group focus-within:border-black transition-all">
                                <div className="pl-3 text-gray-400">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <Input
                                    placeholder="Enter email to invite..."
                                    className="border-none bg-transparent focus-visible:ring-0 text-[15px] h-11"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addReviewerChip()}
                                />
                                <Button
                                    onClick={addReviewerChip}
                                    className="bg-black text-white rounded-lg px-6 h-11 hover:bg-gray-800 transition-all font-medium"
                                >
                                    Add reviewer
                                </Button>
                            </div>

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
                                            className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm"
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

                        <div className="pt-6 mt-6 border-t border-gray-100 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100">
                                        <Eye className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 leading-tight">Enable anonymous review mode</p>
                                        <p className="text-[13px] text-gray-500 mt-0.5">Reviewers won’t see each other’s names or scores until final decision.</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={anonymousMode}
                                    onCheckedChange={setAnonymousMode}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    onClick={sendInvites}
                                    disabled={pendingInvites.length === 0}
                                    className={cn(
                                        "rounded-lg px-8 h-10 font-bold border transition-all",
                                        pendingInvites.length > 0 ? "bg-black text-white hover:bg-gray-800 border-transparent" : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                                    )}
                                >
                                    Confirm Reviewers
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-8">
                    <div className="mb-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 rounded-lg">
                                <Bell className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                                <p className="text-sm text-gray-500 mt-1">Get alerted when new applications arrive.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-4">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-200">
                                        <Slack className="w-6 h-6 text-[#4A154B]" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Slack Notifications</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {notifications.slackConnected ? (
                                                <div className="flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-tight">Connected</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Disconnected</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed pr-4">
                                    Push real-time submission summaries to your designated Slack channel.
                                </p>
                            </div>
                            <div className="lg:col-span-8 bg-gray-50/50 rounded-xl border border-gray-200 p-6 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Webhook URL</label>
                                        {isFetchingSlack && (
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Loading saved settings...
                                            </span>
                                        )}
                                        {!isFetchingSlack && notifications.slackConnected && notifications.slackUrl && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                <CheckCircle className="w-3 h-3" />
                                                Pre-filled from settings
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={isFetchingSlack ? "Loading..." : "https://hooks.slack.com/services/..."}
                                            className="bg-white border-gray-200 focus-visible:ring-black h-11 text-sm font-medium"
                                            value={notifications.slackUrl}
                                            disabled={isFetchingSlack}
                                            onChange={(e) => setNotifications({ ...notifications, slackUrl: e.target.value, slackConnected: false })}
                                        />
                                        <Button
                                            onClick={handleSlackConnect}
                                            disabled={isFetchingSlack || isSavingSlack}
                                            className={cn(
                                                "h-11 px-6 rounded-lg font-bold transition-all shrink-0",
                                                notifications.slackConnected ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100" : "bg-black text-white hover:bg-gray-800"
                                            )}
                                        >
                                            {isSavingSlack ? (
                                                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
                                            ) : notifications.slackConnected ? "Update" : "Connect Slack"}
                                        </Button>
                                    </div>
                                </div>
                                {notifications.slackConnected && !isFetchingSlack && (
                                    <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        <p className="text-xs text-gray-600 font-medium tracking-tight">Slack is connected. New submissions will be posted to your workspace.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-gray-100" />

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-4">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-200">
                                        <Mail className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Email Alerts</p>
                                        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight">Active</span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed pr-4">
                                    Configure which events trigger an automated email to program admins.
                                </p>
                            </div>
                            <div className="lg:col-span-8 bg-gray-50/50 rounded-xl border border-gray-200 p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {["New submission", "Auto-shortlist", "Auto-reject", "Comment added"].map((event) => (
                                        <button
                                            key={event}
                                            onClick={() => toggleEmailEvent(event)}
                                            className={cn(
                                                "flex items-center justify-between p-3.5 rounded-lg border transition-all text-sm font-medium",
                                                notifications.emailEvents.includes(event)
                                                    ? "bg-white border-black text-black"
                                                    : "bg-white/50 border-gray-200 text-gray-400 hover:border-gray-300"
                                            )}
                                        >
                                            {event}
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                                notifications.emailEvents.includes(event)
                                                    ? "bg-black border-black"
                                                    : "bg-transparent border-gray-200"
                                            )}>
                                                {notifications.emailEvents.includes(event) && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="bg-white border border-gray-200 rounded-xl p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-emerald-50 rounded-lg">
                            <Globe className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Launch Settings</h2>
                            <p className="text-sm text-gray-500 mt-1">Configure your public application presence.</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white rounded-lg border border-gray-100">
                                    <Shield className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">Visible on network</p>
                                    <p className="text-sm text-gray-500">Allow Cohortly users to discover this program.</p>
                                </div>
                            </div>
                            <Switch
                                checked={launchSettings.publicStatus}
                                onCheckedChange={(val) => setLaunchSettings({ ...launchSettings, publicStatus: val })}
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                Custom Landing Page URL
                            </label>
                            <div className="flex items-center">
                                <div className="px-5 bg-gray-50 border border-r-0 border-gray-200 h-12 flex items-center text-gray-400 text-[15px] font-medium rounded-l-lg">
                                    cohortly.com/apply/
                                </div>
                                <Input
                                    className="h-12 rounded-l-none rounded-r-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[15px] font-semibold"
                                    value={launchSettings.customSlug}
                                    onChange={(e) => setLaunchSettings({ ...launchSettings, customSlug: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                    SEO Title
                                </label>
                                <Input
                                    className="h-12 rounded-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[15px]"
                                    value={launchSettings.seoTitle}
                                    onChange={(e) => setLaunchSettings({ ...launchSettings, seoTitle: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                    SEO Description
                                </label>
                                <Input
                                    className="h-12 rounded-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[15px]"
                                    value={launchSettings.seoDescription}
                                    onChange={(e) => setLaunchSettings({ ...launchSettings, seoDescription: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-amber-50 rounded-lg">
                            <Mail className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Contact & Support</h2>
                            <p className="text-sm text-gray-500 mt-1">Provide contact information for your applicants.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                Support Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="email"
                                    placeholder="e.g. support@yourprogram.com"
                                    className="h-12 pl-11 rounded-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[15px] font-semibold"
                                    value={cohortData.contactEmail}
                                    onChange={(e) => setCohortData({ ...cohortData, contactEmail: e.target.value })}
                                />
                            </div>
                            <p className="text-xs text-gray-500">This email will be visible on the application form and in success messages.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-black rounded-2xl p-12 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="max-w-4xl mx-auto text-center space-y-12">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 text-sm font-bold uppercase tracking-widest">
                                    <Rocket className="w-4 h-4" />
                                    Launch Readiness
                                </div>
                                <h2 className="text-5xl font-black tracking-tight">Ready to launch?</h2>
                                <p className="text-xl text-gray-400 font-medium">Your program is fully configured and optimized for success.</p>
                            </div>

                            <div className="bg-white/5 rounded-xl border border-white/10 p-8">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="space-y-2 w-full text-center">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Your unique program URL</p>
                                        <div className="flex items-center justify-center gap-4 text-2xl sm:text-3xl font-bold bg-white/5 py-5 px-8 rounded-xl border border-white/10 truncate">
                                            <span className="opacity-40 font-medium">cohortly.app/apply/</span>
                                            <span className="text-white">{launchSettings.customSlug}</span>
                                            <button
                                                onClick={() => copyToClipboard(`https://cohortly.app/apply/${launchSettings.customSlug}`)}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-all ml-2"
                                            >
                                                <Copy className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col items-center justify-center gap-4 group hover:bg-white/10 transition-all">
                                            <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center text-black">
                                                <QrCode className="w-16 h-16" />
                                            </div>
                                            <p className="text-xs font-bold uppercase tracking-wider opacity-60">QR code for events</p>
                                        </div>

                                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-3 lg:col-span-2 group hover:bg-white/10 transition-all text-left">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Code className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">Embed Snippet</span>
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(embedCode)}
                                                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider hover:text-white/80 transition-colors"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                    Copy snippet
                                                </button>
                                            </div>
                                            <div className="bg-black/20 rounded-lg p-4 font-mono text-xs text-gray-400 whitespace-pre-wrap break-all border border-white/5 h-32 overflow-y-auto">
                                                {embedCode}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Button className="h-10 px-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest">
                                            <Linkedin className="w-4 h-4 mr-2" />
                                            Share on LinkedIn
                                        </Button>
                                        <Button className="h-10 px-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest">
                                            <Twitter className="w-4 h-4 mr-2" />
                                            Share on X
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-8 py-6 border-y border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold">Form complete</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold">Rubric optimized</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold">Reviewers invited</span>
                                </div>
                            </div>

                            <div className="flex justify-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={onBack}
                                    className="bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white h-14 px-8 rounded-xl font-bold text-lg"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleLaunch}
                                    disabled={loading}
                                    className="bg-white text-black hover:bg-gray-100 h-14 px-12 rounded-xl font-bold text-lg shadow-none flex items-center gap-3 transition-transform hover:scale-[1.02]"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Launching...
                                        </>
                                    ) : (
                                        <>
                                            Open Applications
                                            <Rocket className="w-5 h-5" />
                                        </>
                                    )}
                                </Button>
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
                                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-full shadow-2xl flex items-center gap-3 border border-gray-800"
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
