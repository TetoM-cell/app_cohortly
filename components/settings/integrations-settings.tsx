"use client";

import React, { useState, useEffect } from "react";
import { Zap, Loader2, Link as LinkIcon, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

export function IntegrationsSettings() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    // Slack State
    const [slackUrl, setSlackUrl] = useState("");
    const [connectedUrl, setConnectedUrl] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                setUserId(user.id);

                const { data, error } = await supabase
                    .from('user_settings')
                    .select('slack_webhook_url')
                    .eq('user_id', user.id)
                    .single();

                if (data?.slack_webhook_url) {
                    setConnectedUrl(data.slack_webhook_url);
                    setSlackUrl(data.slack_webhook_url); 
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleConnectSlack = async () => {
        if (!slackUrl.startsWith("https://hooks.slack.com/services/")) {
            toast.error("Invalid Slack Webhook URL.");
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: userId,
                    slack_webhook_url: slackUrl,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setConnectedUrl(slackUrl);
            toast.success("Slack connected!");
        } catch (error: any) {
            toast.error(`Failed to connect: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnectSlack = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('user_settings')
                .update({ slack_webhook_url: null })
                .eq('user_id', userId);

            if (error) throw error;

            setConnectedUrl(null);
            setSlackUrl("");
            toast.success("Slack disconnected.");
        } catch (error: any) {
            toast.error(`Failed to disconnect: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestNotification = async () => {
        setIsTesting(true);
        try {
            const { error } = await supabase.functions.invoke('notify-slack', {
                body: {
                    message: 'Test from Cohortly! Your integration is working perfectly.',
                    emoji: ':tada:',
                    programName: 'Integration Test'
                }
            });

            if (error) throw error;
            toast.success("Test notification sent!");
        } catch (error: any) {
            toast.error(`Test failed: ${error.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900">Integrations</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    Connect Cohortly with your favorite tools.
                </p>
            </div>

            <Separator />

            <div className="grid gap-6">
                <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-gray-50/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-2">
                                    <svg viewBox="0 0 448 512" className="w-full h-full text-black" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M94.12 315.1c0 25.9-21.16 47.06-47.06 47.06S0 341 0 315.1c0-25.9 21.16-47.06 47.06-47.06h47.06v47.06zm23.72 0c0-25.9 21.16-47.06 47.06-47.06s47.06 21.16 47.06 47.06v117.84c0 25.9-21.16 47.06-47.06 47.06s-47.06-21.16-47.06-47.06V315.1zm47.06-188.98c-25.9 0-47.06-21.16-47.06-47.06S139 32 164.9 32s47.06 21.16 47.06 47.06v47.06H164.9zm0 23.72c25.9 0 47.06 21.16 47.06 47.06s-21.16 47.06-47.06 47.06H47.06C21.16 243.96 0 222.8 0 196.9s21.16-47.06 47.06-47.06H164.9zm188.98 47.06c0-25.9 21.16-47.06 47.06-47.06 25.9 0 47.06 21.16 47.06 47.06s-21.16 47.06-47.06 47.06h-47.06V196.9zm-23.72 0c0 25.9-21.16 47.06-47.06 47.06-25.9 0-47.06-21.16-47.06-47.06V79.06c0-25.9 21.16-47.06 47.06-47.06 25.9 0 47.06 21.16 47.06 47.06V196.9zM283.1 385.88c25.9 0 47.06 21.16 47.06 47.06 0 25.9-21.16 47.06-47.06 47.06-25.9 0-47.06-21.16-47.06-47.06v-47.06h47.06zm0-23.72c-25.9 0-47.06-21.16-47.06-47.06 0-25.9 21.16-47.06 47.06-47.06h117.84c25.9 0 47.06 21.16 47.06 47.06 0 25.9-21.16 47.06-47.06 47.06H283.1z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-xs font-bold uppercase tracking-tight">Slack Notifications</CardTitle>
                                        {connectedUrl && (
                                            <Badge variant="outline" className="h-4 bg-green-50 text-green-700 border-none text-[10px] font-bold px-1.5 uppercase">
                                                Connected
                                            </Badge>
                                        )}
                                    </div>
                                    <CardDescription className="text-[11px]">
                                        Get real-time alerts for new applications.
                                    </CardDescription>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        {!connectedUrl ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="webhook-url" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Webhook URL</Label>
                                    <Input
                                        id="webhook-url"
                                        placeholder="https://hooks.slack.com/services/..."
                                        value={slackUrl}
                                        onChange={(e) => setSlackUrl(e.target.value)}
                                        className="font-mono text-[11px] h-9"
                                    />
                                    <p className="text-[10px] text-gray-500 leading-relaxed">
                                        Paste your Slack Incoming Webhook URL. You can create one at <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">api.slack.com/apps</a>.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <LinkIcon className="w-3.5 h-3.5" />
                                        <span className="font-mono text-[10px] truncate max-w-[300px] opacity-70">
                                            {connectedUrl}
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] bg-white font-bold uppercase tracking-wider"
                                        onClick={handleTestNotification}
                                        disabled={isTesting}
                                    >
                                        {isTesting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Zap className="w-3 h-3 mr-2" />}
                                        Test
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="bg-gray-50/30 border-t border-gray-100 flex justify-end gap-3 py-3">
                        {!connectedUrl ? (
                            <Button
                                onClick={handleConnectSlack}
                                disabled={!slackUrl || isSaving}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-[11px] font-bold uppercase tracking-wider"
                            >
                                {isSaving && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                                Connect Slack
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 text-[11px] font-bold uppercase tracking-wider"
                                onClick={handleDisconnectSlack}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <XCircle className="w-3 h-3 mr-2" />}
                                Disconnect
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
