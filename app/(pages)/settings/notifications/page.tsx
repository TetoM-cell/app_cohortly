"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import {
    Bell,
    Smartphone,
    Volume2,
    Slack,
    Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SettingsSkeleton } from "../components/settings-skeleton";

export default function SettingsNotificationsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Email Preferences
    const [emailPrefs, setEmailPrefs] = useState({
        newApplication: true,
        autoDecision: true,
        newComment: true,
        billing: true
    });

    // Slack Preferences
    const [slackConnected, setSlackConnected] = useState(false);
    const [slackChannel, setSlackChannel] = useState("general");
    const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
    const [isConnectingSlack, setIsConnectingSlack] = useState(false);
    const [slackPrefs, setSlackPrefs] = useState({
        newApplication: false,
        autoDecision: true,
        newComment: false,
        billing: true
    });

    // In-App Preferences
    const [inAppPrefs, setInAppPrefs] = useState({
        pushOnMobile: true,
        sound: false,
        vibration: true
    });

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

                if (profile?.preferences?.notifications) {
                    const prefs = profile.preferences.notifications;
                    if (prefs.email) setEmailPrefs(prev => ({ ...prev, ...prefs.email }));
                    if (prefs.slack) {
                        setSlackPrefs(prev => ({ ...prev, ...prefs.slack.prefs }));
                        setSlackChannel(prefs.slack.channel || "general");
                        setSlackConnected(prefs.slack.connected || false);
                    }
                    if (prefs.inApp) setInAppPrefs(prev => ({ ...prev, ...prefs.inApp }));
                }

                // Fetch Slack Webhook
                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('slack_webhook_url')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (settings?.slack_webhook_url) {
                    setSlackWebhookUrl(settings.slack_webhook_url);
                }
            }
            setIsLoading(false);
        };
        fetchPreferences();
    }, []);

    const savePreferences = async (section: string, data: any) => {
        if (!user) return;

        try {
            // Fetch current all preferences to merge
            const { data: profile } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('id', user.id)
                .single();

            const current = profile?.preferences || {};
            const currentNotifs = current.notifications || {};

            let newNotifs = { ...currentNotifs };

            if (section === 'email') newNotifs.email = data;
            if (section === 'slack') newNotifs.slack = data; // store channel, connected, prefs
            if (section === 'inApp') newNotifs.inApp = data;

            const { error } = await supabase
                .from('profiles')
                .update({
                    preferences: { ...current, notifications: newNotifs }
                })
                .eq('id', user.id);

            if (error) throw error;
            // toast.success("Saved"); // Auto-save behavior, maybe too noisy to toast every click
        } catch (error) {
            console.error("Error saving notifications:", error);
            toast.error("Failed to save changes");
        }
    };

    const handleEmailToggle = (key: keyof typeof emailPrefs) => {
        const newVal = { ...emailPrefs, [key]: !emailPrefs[key] };
        setEmailPrefs(newVal);
        savePreferences('email', newVal);
    };

    const handleSlackToggle = (key: keyof typeof slackPrefs) => {
        const newPrefs = { ...slackPrefs, [key]: !slackPrefs[key] };
        setSlackPrefs(newPrefs);
        savePreferences('slack', { connected: slackConnected, channel: slackChannel, prefs: newPrefs });
    };

    const handleSlackChannelChange = (val: string) => {
        setSlackChannel(val);
        savePreferences('slack', { connected: slackConnected, channel: val, prefs: slackPrefs });
    }

    const handleInAppToggle = (key: keyof typeof inAppPrefs) => {
        const newVal = { ...inAppPrefs, [key]: !inAppPrefs[key] };
        setInAppPrefs(newVal);
        savePreferences('inApp', newVal);
    };

    const handleConnectSlack = () => {
        setIsConnectingSlack(true);
    };

    const handleSaveSlackWebhook = async (url: string) => {
        if (!user) return;
        if (!url.startsWith('https://hooks.slack.com/')) {
            toast.error("Please enter a valid Slack Incoming Webhook URL");
            return;
        }

        const loadingToast = toast.loading("Saving Slack connection...");
        try {
            // 1. Save to user_settings table
            const { error: settingsError } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    slack_webhook_url: url,
                    updated_at: new Date().toISOString()
                });

            if (settingsError) throw settingsError;

            // 2. Update profile preference
            setSlackConnected(true);
            setSlackWebhookUrl(url);
            await savePreferences('slack', { connected: true, channel: slackChannel, prefs: slackPrefs });

            toast.dismiss(loadingToast);
            toast.success("Successfully connected to Slack workspace");
            setIsConnectingSlack(false);
        } catch (error) {
            console.error("Error connecting Slack:", error);
            toast.dismiss(loadingToast);
            toast.error("Failed to connect Slack. Please try again.");
        }
    };

    const handleDisconnectSlack = () => {
        setSlackConnected(false);
        savePreferences('slack', { connected: false, channel: slackChannel, prefs: slackPrefs });
        toast.success("Disconnected from Slack");
    };

    const handleTestNotification = () => {
        toast.message("New Application Received", {
            description: "Sarah Johnson applied to Summer 2026 Batch",
            action: {
                label: "View",
                onClick: () => console.log("View application")
            },
        });

        // Simulate email
        setTimeout(() => {
            toast.info("Test email sent to your inbox");
        }, 1000);
    };

    if (isLoading) {
        return <SettingsSkeleton />;
    }

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight text-gray-900">Notification Preferences</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Choose how and when you want to be notified.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleTestNotification}>
                    Test notification
                </Button>
            </div>

            <Separator />

            {/* Email Notifications */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-500">
                        Receive updates directly to your inbox.
                    </p>
                </div>

                <div className="md:col-span-2 space-y-4 max-w-2xl">
                    <div className="space-y-1">
                        {[
                            { key: "newApplication", id: "email-new-app", label: "New Application Received", desc: "Get notified when a candidate submits an application." },
                            { key: "autoDecision", id: "email-auto-decision", label: "Auto-Shortlist / Reject", desc: "Notify when AI automatically categorizes an application." },
                            { key: "newComment", id: "email-comments", label: "Comments & Mentions", desc: "When someone comments on an application or mentions you." },
                            { key: "billing", id: "email-billing", label: "Billing Issues", desc: "Failed payments or subscription updates." }
                        ].map((item) => (
                            <div
                                key={item.key}
                                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => handleEmailToggle(item.key as keyof typeof emailPrefs)}
                            >
                                <Checkbox
                                    id={item.id}
                                    checked={emailPrefs[item.key as keyof typeof emailPrefs]}
                                    onCheckedChange={() => handleEmailToggle(item.key as keyof typeof emailPrefs)}
                                // onClick={(e) => e.stopPropagation()} // Let parenet handle
                                />
                                <div className="grid gap-0.5 leading-none">
                                    <label
                                        htmlFor={item.id}
                                        className="text-sm font-medium leading-none cursor-pointer"
                                    >
                                        {item.label}
                                    </label>
                                    <p className="text-xs text-gray-500">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Separator />

            {/* Slack Notifications */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Slack Notifications</h4>
                    <p className="text-sm text-gray-500">
                        Get updates in your team's Slack channel.
                    </p>
                    <div className="pt-4">
                        {slackConnected ? (
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 -ml-2" onClick={handleDisconnectSlack}>
                                Disconnect Slack
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={handleConnectSlack}>
                                Connect Slack
                            </Button>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2 space-y-6 max-w-2xl">
                    {!slackConnected ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <Slack className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-900">Slack is not connected</p>
                            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto px-4">
                                Connect your Slack workspace to receive real-time updates on new applications and team activity.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Post to Channel</label>
                                <Select value={slackChannel} onValueChange={handleSlackChannelChange}>
                                    <SelectTrigger className="bg-white border-gray-200">
                                        <SelectValue placeholder="Select channel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">#general</SelectItem>
                                        <SelectItem value="applications">#applications</SelectItem>
                                        <SelectItem value="reviews">#reviews-team</SelectItem>
                                        <SelectItem value="notifications">#notifications</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                {[
                                    { key: "newApplication", id: "slack-new-app", label: "New Application Received", desc: "Post when a new application comes in." },
                                    { key: "autoDecision", id: "slack-auto-decision", label: "Auto-Shortlist / Reject", desc: "Post AI-driven status changes." },
                                    { key: "newComment", id: "slack-comments", label: "Comments & Mentions", desc: "Post simplified comment threads." },
                                    { key: "billing", id: "slack-billing", label: "Billing Issues", desc: "Alert channel on payment failures." }
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="grid gap-1.5 leading-none pr-4">
                                            <Label htmlFor={item.id} className="cursor-pointer font-medium">{item.label}</Label>
                                            <p className="text-xs text-gray-500">{item.desc}</p>
                                        </div>
                                        <Switch
                                            id={item.id}
                                            checked={slackPrefs[item.key as keyof typeof slackPrefs]}
                                            onCheckedChange={() => handleSlackToggle(item.key as keyof typeof slackPrefs)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Separator />

            {/* In-App Notifications */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Push & App Settings</h4>
                    <p className="text-sm text-gray-500">
                        Manage push notifications and sounds.
                    </p>
                </div>

                <div className="md:col-span-2 space-y-1 max-w-2xl">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-md border border-gray-100">
                                <Bell className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="push-mobile" className="cursor-pointer font-medium">Push Notifications</Label>
                                <p className="text-xs text-gray-500">Receive push notifications on your mobile device.</p>
                            </div>
                        </div>
                        <Switch
                            id="push-mobile"
                            checked={inAppPrefs.pushOnMobile}
                            onCheckedChange={() => handleInAppToggle("pushOnMobile")}
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-md border border-gray-100">
                                <Volume2 className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="app-sound" className="cursor-pointer font-medium">Sound</Label>
                                <p className="text-xs text-gray-500">Play a sound for in-app notifications.</p>
                            </div>
                        </div>
                        <Switch
                            id="app-sound"
                            checked={inAppPrefs.sound}
                            onCheckedChange={() => handleInAppToggle("sound")}
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-md border border-gray-100">
                                <Smartphone className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="app-vibration" className="cursor-pointer font-medium">Vibration</Label>
                                <p className="text-xs text-gray-500">Vibrate on mobile for important alerts.</p>
                            </div>
                        </div>
                        <Switch
                            id="app-vibration"
                            checked={inAppPrefs.vibration}
                            onCheckedChange={() => handleInAppToggle("vibration")}
                        />
                    </div>
                </div>
            </div>

            <Dialog open={isConnectingSlack} onOpenChange={setIsConnectingSlack}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Connect Slack Workspace</DialogTitle>
                        <DialogDescription>
                            Paste your Incoming Webhook URL from your Slack App dashboard to receive notifications.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="webhook-url">Webhook URL</Label>
                            <Input
                                id="webhook-url"
                                placeholder="https://hooks.slack.com/services/..."
                                value={slackWebhookUrl}
                                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-500">
                                You can find this in your Slack App's "Incoming Webhooks" section.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConnectingSlack(false)}>Cancel</Button>
                        <Button onClick={() => handleSaveSlackWebhook(slackWebhookUrl)}>Connect</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
