import React, { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Users,
    Mail,
    Globe,
    Shield,
    X,
    ChevronDown,
    Check,
    CheckCircle,
    Copy,
    Loader2,
    Target,
    Clock,
    UserPlus,
    XCircle,
    Download,
    AlertTriangle,
    ListChecks,
    Plus,
    EyeOff,
    Link2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { exportCohortToJSON } from "@/lib/migration";

interface CohortSettingsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    program: any;
    onRefresh: () => void;
}

export function CohortSettingsSheet({ open, onOpenChange, program, onRefresh }: CohortSettingsSheetProps) {
    const [loading, setLoading] = useState(false);

    // Reviewers State
    const [emailInput, setEmailInput] = useState("");
    const [reviewers, setReviewers] = useState<{ email: string; role: string; status: string }[]>([]);
    const [pendingInvites, setPendingInvites] = useState<{ email: string; role: string }[]>([]);

    // Notifications State
    const [notifications, setNotifications] = useState({
        emailEvents: ["New submission"],
    });

    // Launch Settings State
    const [launchSettings, setLaunchSettings] = useState({
        publicStatus: true,
        customSlug: "",
        seoTitle: "",
        seoDescription: "",
        openDate: "",
        deadline: ""
    });

    // Automation & Limits State
    const [automation, setAutomation] = useState({
        enabled: false,
        shortlistThreshold: 80,
        rejectThreshold: 50,
        targetLimit: 50
    });

    // Blind Review Mode State
    const [blindReview, setBlindReview] = useState(false);

    // Rubrics State
    const [rubrics, setRubrics] = useState<any[]>([]);
    const [deletedRubricIds, setDeletedRubricIds] = useState<string[]>([]);

    // Initialize state from program prop when sheet opens
    useEffect(() => {
        if (open && program) {
            setReviewers(program.reviewers || []);
            setRubrics(program.rubric ? JSON.parse(JSON.stringify(program.rubric)) : []);
            setDeletedRubricIds([]);
            setBlindReview(program.blind_review === true);
            // Here you'd map other DB fields if they existed, using defaults for now
            setLaunchSettings({
                publicStatus: program.is_public !== false, // Default true if undefined
                customSlug: program.slug || (program.name || "new-program").toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                seoTitle: program.name || "",
                seoDescription: "Apply now for our upcoming program.",
                openDate: program.open_date ? new Date(program.open_date).toISOString().slice(0, 16) : "",
                deadline: program.deadline ? new Date(program.deadline).toISOString().slice(0, 16) : ""
            });
            // Notifications placeholder
            setNotifications({
                emailEvents: ["New submission"]
            });

            // Thresholds
            const rules = program.threshold_rules || [];
            const hasAutomation = rules.some((r: any) => r.action === 'shortlist' || r.action === 'reject');
            const shortlist = rules.find((r: any) => r.action === 'shortlist')?.value || 80;
            const reject = rules.find((r: any) => r.action === 'reject')?.value || 50;
            const target = rules.find((r: any) => r.target === 'limit')?.value || 50;

            setAutomation({
                enabled: hasAutomation,
                shortlistThreshold: shortlist,
                rejectThreshold: reject,
                targetLimit: target
            });
        }
    }, [open, program]);

    const handleSave = async () => {
        if (!program?.id) return;
        setLoading(true);

        try {
            // 1. Send Notifications for New (Pending) Invites
            if (pendingInvites.length > 0) {
                const { data: { user: currentUser } } = await supabase.auth.getUser();

                for (const invite of pendingInvites) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', invite.email)
                        .single();

                    if (profile) {
                        await supabase
                            .from('notifications')
                            .insert({
                                recipient_id: profile.id,
                                type: 'invitation',
                                title: 'New Reviewer Invitation',
                                message: `You have been invited to review applications for ${program.name}.`,
                                metadata: {
                                    program_id: program.id,
                                    role: invite.role.toLowerCase(),
                                    inviter_email: currentUser?.email,
                                    cohort_name: program.name
                                }
                            });
                    }
                }
            }

            // 2. Update program record (including JSON reviewers for consistency)
            const allReviewers = [
                ...reviewers,
                ...pendingInvites.map(p => ({ email: p.email, role: p.role, status: "Sent" }))
            ];

            const { error: progUpdateError } = await supabase
                .from('programs')
                .update({
                    is_public: launchSettings.publicStatus,
                    slug: launchSettings.customSlug,
                    blind_review: blindReview,
                    open_date: launchSettings.openDate || null,
                    deadline: launchSettings.deadline || null
                })
                .eq('id', program.id);

            if (progUpdateError) throw progUpdateError;

            // 3. Save Thresholds / Limits
            await supabase.from('threshold_rules').delete().eq('program_id', program.id);
            const newRules = [];
            if (automation.enabled) {
                newRules.push({ program_id: program.id, target: 'overall_ai_score', operator: '>=', value: automation.shortlistThreshold, action: 'shortlist' });
                newRules.push({ program_id: program.id, target: 'overall_ai_score', operator: '<', value: automation.rejectThreshold, action: 'reject' });
            }
            newRules.push({ program_id: program.id, target: 'limit', operator: '=', value: automation.targetLimit, action: 'flag' });

            if (newRules.length > 0) {
                const { error: rulesError } = await supabase.from('threshold_rules').insert(newRules);
                if (rulesError) throw rulesError;
            }

            // 4. Save Rubrics
            if (deletedRubricIds.length > 0) {
                await supabase.from('rubrics').delete().in('id', deletedRubricIds);
            }

            const validRubrics = rubrics.filter(r => r.name.trim() !== "");
            const rubricsToUpdate = validRubrics.filter(r => r.id);
            const rubricsToInsert = validRubrics.filter(r => !r.id).map(r => ({
                program_id: program.id,
                name: r.name,
                description: r.description,
                weight: r.weight
            }));

            for (const r of rubricsToUpdate) {
                const { error: updateErr } = await supabase.from('rubrics').update({
                    name: r.name,
                    description: r.description,
                    weight: r.weight
                }).eq('id', r.id);
                if (updateErr) console.error("Error updating rubric:", updateErr);
            }
            if (rubricsToInsert.length > 0) {
                const { error: insertErr } = await supabase.from('rubrics').insert(rubricsToInsert);
                if (insertErr) console.error("Error inserting rubrics:", insertErr);
            }

            toast.success(pendingInvites.length > 0 ? "Settings saved and invitations sent." : "Settings saved successfully.");
            setPendingInvites([]);
            onRefresh();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Failed to save settings:", error);
            toast.error(error.message || "Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    // --- Reviewer Helpers ---
    const addReviewerChip = async () => {
        if (!emailInput || !emailInput.includes("@")) return;
        if (pendingInvites.some(p => p.email === emailInput)) return;
        if (reviewers.some(r => r.email.toLowerCase() === emailInput.toLowerCase())) {
            toast.info("User is already a reviewer.");
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
                toast.error("User not found. Reviewers must already be signed in to Cohortly.");
                return;
            }

            // Check if there's already a pending invitation in notifications
            const { data: existingInvite } = await supabase
                .from('notifications')
                .select('id')
                .eq('recipient_id', profile.id)
                .eq('type', 'invitation')
                .eq('status', 'active')
                .contains('metadata', { program_id: program.id })
                .maybeSingle();

            if (existingInvite) {
                toast.error("An invitation for this user is already pending.");
                return;
            }

            setPendingInvites([...pendingInvites, { email: emailInput, role: "Reviewer" }]);
            setEmailInput("");
        } catch (err) {
            console.error("Error checking user:", err);
            toast.error("Failed to verify user.");
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

    const removeReviewer = (email: string) => {
        setReviewers(reviewers.filter(r => r.email !== email));
    };

    // --- Notification Helpers ---
    const toggleEmailEvent = (event: string) => {
        setNotifications(prev => ({
            ...prev,
            emailEvents: prev.emailEvents.includes(event)
                ? prev.emailEvents.filter(e => e !== event)
                : [...prev.emailEvents, event]
        }));
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-[#FBFCFD] p-0 border-l border-gray-200 shadow-2xl">
                <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-6 flex items-center justify-between">
                    <div>
                        <SheetTitle className="text-2xl font-bold text-gray-900">Cohort Settings</SheetTitle>
                        <SheetDescription className="text-gray-500 mt-1">
                            Modify settings for {program?.name || "this cohort"}.
                        </SheetDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={loading} className="min-w-[100px]">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </div>

                <div className="p-6 space-y-8 pb-24">
                    {/* 1. Invite Reviewers */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div>
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Reviewers</h3>
                                <p className="text-sm text-gray-500">Manage team access for this program.</p>
                                <p className="text-[11px] font-bold text-amber-600 mt-2 flex items-center gap-1.5 bg-amber-50 w-fit px-2 py-0.5 rounded-full border border-amber-100">
                                    <AlertTriangle className="w-3 h-3" />
                                    Reviewers must already be signed into Cohortly.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-xl border border-gray-200 group focus-within:border-black transition-all">
                                <div className="pl-3 text-gray-400">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <Input
                                    placeholder="Enter email to invite..."
                                    className="border-none bg-transparent focus-visible:ring-0 text-[15px] h-10"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addReviewerChip()}
                                />
                                <Button
                                    onClick={addReviewerChip}
                                    className="bg-black text-white rounded-lg px-6 h-10 hover:bg-gray-800 transition-all font-medium"
                                >
                                    Add
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-3 p-4 bg-gray-50/30 rounded-xl border border-dashed border-gray-200 min-h-[100px] items-center justify-center">
                                {reviewers.length === 0 && pendingInvites.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-gray-400">No reviewers currently added.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Existing Reviewers */}
                                        {reviewers.map((rev) => (
                                            <div
                                                key={`rev-${rev.email}`}
                                                className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm animate-in fade-in zoom-in-95 duration-200"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-[10px] font-bold text-emerald-600">
                                                    {rev.email.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">{rev.email}</span>
                                                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 uppercase">
                                                    {rev.role}
                                                </span>
                                                <button
                                                    onClick={() => removeReviewer(rev.email)}
                                                    className="p-1 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Pending Invites */}
                                        {pendingInvites.map((invite, index) => (
                                            <div
                                                key={`pending-${invite.email}`}
                                                className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-blue-50/50 border border-blue-100 rounded-full animate-in fade-in zoom-in-95 duration-200"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                    {invite.email.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-blue-700 truncate max-w-[150px]">{invite.email}</span>
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
                                                    className="p-1 text-blue-300 hover:text-red-500 transition-all rounded-full"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Guest Portal Link */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div>
                                    <Link2 className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Guest Reviewer Portal</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Share this link with external judges to evaluate without an account.</p>
                                </div>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
                                onClick={() => {
                                    const url = `${window.location.origin}/review/${program.id}`;
                                    navigator.clipboard.writeText(url);
                                    toast.success("Guest Portal link copied to clipboard!");
                                }}
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Copy Link
                            </Button>
                        </div>
                    </div>

                    {/* 3. Rubrics Management */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div>
                                <ListChecks className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Rubrics & Scoring</h3>
                                <p className="text-sm text-gray-500">Define the criteria for evaluating applications.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {rubrics.map((rubric, index) => (
                                <div key={rubric.id || `new-${index}`} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative group">
                                    <button
                                        onClick={() => {
                                            if (rubric.id) {
                                                setDeletedRubricIds([...deletedRubricIds, rubric.id]);
                                            }
                                            setRubrics(rubrics.filter((_, i) => i !== index));
                                        }}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="grid grid-cols-[1fr_80px] gap-3 pr-6">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Criterion Name</label>
                                            <Input
                                                value={rubric.name}
                                                onChange={(e) => {
                                                    const newRubrics = [...rubrics];
                                                    newRubrics[index].name = e.target.value;
                                                    setRubrics(newRubrics);
                                                }}
                                                placeholder="e.g. Traction"
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Weight</label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={rubric.weight || 0}
                                                onChange={(e) => {
                                                    const newRubrics = [...rubrics];
                                                    newRubrics[index].weight = parseInt(e.target.value) || 0;
                                                    setRubrics(newRubrics);
                                                }}
                                                className="bg-white text-center"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description (Optional)</label>
                                        <Input
                                            value={rubric.description || ""}
                                            onChange={(e) => {
                                                const newRubrics = [...rubrics];
                                                newRubrics[index].description = e.target.value;
                                                setRubrics(newRubrics);
                                            }}
                                            placeholder="What does this score mean?"
                                            className="bg-white"
                                        />
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                className="w-full border-dashed border-2 py-6 text-gray-500 hover:text-black bg-gray-50/50 hover:bg-gray-100"
                                onClick={() => {
                                    setRubrics([...rubrics, { name: "", description: "", weight: 10 }]);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Criterion
                            </Button>
                        </div>
                    </div>

                    {/* 3. Notifications */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div>
                                <Mail className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Email Alerts</h3>
                                <p className="text-sm text-gray-500">System notifications sent to admins.</p>
                            </div>
                        </div>

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

                    {/* 3. Automation & Target Limits */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div>
                                    <Target className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Automation & Limits</h3>
                                    <p className="text-sm text-gray-500">Auto-shortlist, reject, and set capacity.</p>
                                </div>
                            </div>
                            <Switch
                                checked={automation.enabled}
                                onCheckedChange={(val) => setAutomation({ ...automation, enabled: val })}
                                className="bg-gray-200 data-[state=checked]:bg-black"
                            />
                        </div>

                        <AnimatePresence>
                            {automation.enabled && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-4 overflow-hidden mb-6"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Auto-Shortlist */}
                                        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <UserPlus className="w-4 h-4 text-emerald-600" />
                                                    <h3 className="text-[12px] font-black uppercase tracking-widest text-emerald-800">Auto-Shortlist</h3>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-emerald-600/60 font-mono">≥</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={automation.shortlistThreshold}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setAutomation({ ...automation, shortlistThreshold: Math.min(100, Math.max(0, val)) });
                                                        }}
                                                        className="w-16 h-8 text-center font-black border-emerald-200 focus-visible:ring-emerald-500 rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-emerald-900/60 font-medium leading-relaxed">
                                                Automatically shortlist if score is ≥ {automation.shortlistThreshold}.
                                            </p>
                                        </div>

                                        {/* Auto-Reject */}
                                        <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                    <h3 className="text-[12px] font-black uppercase tracking-widest text-red-800">Auto-Reject</h3>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-red-600/60 font-mono">&lt;</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={automation.rejectThreshold}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setAutomation({ ...automation, rejectThreshold: Math.min(100, Math.max(0, val)) });
                                                        }}
                                                        className="w-16 h-8 text-center font-black border-red-200 focus-visible:ring-red-500 rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-red-900/60 font-medium leading-relaxed">
                                                Automatically decline if score is &lt; {automation.rejectThreshold}.
                                            </p>
                                        </div>

                                        <div className="md:col-span-2 p-3 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Manual Review Window</span>
                                            </div>
                                            <span className="text-xs font-black text-gray-900 px-2.5 py-1 bg-white border border-gray-200 rounded-md">
                                                {automation.rejectThreshold} - {automation.shortlistThreshold - 1} pts
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="pt-4 border-t border-gray-100 space-y-3">
                            <label className="flex items-center justify-between text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                <span>Shortlist Target Limit</span>
                                <span className="text-xs font-normal text-gray-500 capitalize">Set the capacity metric</span>
                            </label>
                            <Input
                                type="number"
                                min="1"
                                className="h-11 rounded-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[14px] font-semibold"
                                value={automation.targetLimit}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setAutomation({ ...automation, targetLimit: Math.max(1, val) });
                                }}
                            />
                        </div>

                        {/* Blind Review Mode */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl border border-violet-100">
                                <div className="flex items-center gap-3">
                                    <EyeOff className="w-4 h-4 text-violet-600 shrink-0" />
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">Blind Review Mode</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Hide AI scores from reviewers until they submit their own evaluation. Prevents anchoring bias.</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={blindReview}
                                    onCheckedChange={setBlindReview}
                                    className="bg-gray-200 data-[state=checked]:bg-violet-600 shrink-0 ml-4"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 4. Launch Settings */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div>
                                <Globe className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Launch Settings</h3>
                                <p className="text-sm text-gray-500">Visibility and SEO configuration.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <Shield className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Visible on network</p>
                                        <p className="text-sm text-gray-500">Allow users to discover this program via search.</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={launchSettings.publicStatus}
                                    onCheckedChange={(val) => setLaunchSettings({ ...launchSettings, publicStatus: val })}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                    Custom Landing Page URL
                                </label>
                                <div className="flex items-center">
                                    <div className="px-4 bg-gray-50 border border-r-0 border-gray-200 h-11 flex items-center text-gray-400 text-[14px] font-medium rounded-l-lg truncate">
                                        cohortly.app/apply/
                                    </div>
                                    <Input
                                        className="h-11 rounded-l-none rounded-r-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[14px] font-semibold"
                                        value={launchSettings.customSlug}
                                        onChange={(e) => setLaunchSettings({ ...launchSettings, customSlug: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                        Applications Open
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        className="h-11 rounded-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[14px]"
                                        value={launchSettings.openDate}
                                        onChange={(e) => setLaunchSettings({ ...launchSettings, openDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                        Application Deadline
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        className="h-11 rounded-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[14px]"
                                        value={launchSettings.deadline}
                                        onChange={(e) => setLaunchSettings({ ...launchSettings, deadline: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                        SEO Title
                                    </label>
                                    <Input
                                        className="h-11 rounded-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[14px]"
                                        value={launchSettings.seoTitle}
                                        onChange={(e) => setLaunchSettings({ ...launchSettings, seoTitle: e.target.value })}
                                        placeholder="e.g. Acme S24 Accelerator"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                        SEO Description
                                    </label>
                                    <Input
                                        className="h-11 rounded-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[14px]"
                                        value={launchSettings.seoDescription}
                                        onChange={(e) => setLaunchSettings({ ...launchSettings, seoDescription: e.target.value })}
                                        placeholder="Write a short summary..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5. Data & Migration */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div>
                                <Download className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Data & Migration</h3>
                                <p className="text-sm text-gray-500">Export your cohort layout and applicants offline.</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="font-bold text-gray-900">Full Cohort Snapshot (.json)</p>
                                    <p className="text-sm text-gray-500">Includes settings, form configurations, rubrics, and applicants.</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="bg-white"
                                onClick={async () => {
                                    if (!program?.id) return;
                                    setLoading(true);
                                    try {
                                        await exportCohortToJSON(program.id, supabase);
                                        toast.success("Snapshot downloaded.");
                                    } catch (err: any) {
                                        toast.error("Failed to export: " + err.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                            >
                                Export JSON
                            </Button>
                        </div>
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    );
}
