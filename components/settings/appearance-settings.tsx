"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { usePreferences } from "@/app/context/preferences-context";
import { useEffect, useState } from "react";

export function AppearanceSettings() {
    const { preferences, updatePreference } = usePreferences();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="space-y-8 max-w-4xl pb-10">
            <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900">Customize Cohortly</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    Manage the look and feel of your workspace.
                </p>
            </div>
            <Separator />

            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Display Preferences</h4>
                    <p className="text-xs text-gray-500">Customize how data is displayed in your workspace.</p>
                </div>

                <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6 md:col-span-2">
                    <div className="sm:col-span-3">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Table Density</Label>
                        <div className="mt-1">
                            <Select
                                value={preferences.density}
                                onValueChange={(val) => updatePreference("density", val)}
                            >
                                <SelectTrigger className="h-8 text-xs bg-white">
                                    <SelectValue placeholder="Select density" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="comfortable">Comfortable</SelectItem>
                                    <SelectItem value="compact">Compact</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">UI Scaling</Label>
                        <div className="mt-1">
                            <Select
                                value={String(preferences.scaling || "100")}
                                onValueChange={(val) => updatePreference("scaling", val)}
                            >
                                <SelectTrigger className="h-8 text-xs bg-white">
                                    <SelectValue placeholder="Select scale" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="110">110% (Large text)</SelectItem>
                                    <SelectItem value="100">100% (Default - 1080p)</SelectItem>
                                    <SelectItem value="90">90% (Dense - 1440p)</SelectItem>
                                    <SelectItem value="80">80% (Ultra dense - 4K)</SelectItem>
                                    <SelectItem value="75">75% (Maximum - XDR)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Date Format</Label>
                        <div className="mt-1">
                            <Select
                                value={preferences.dateFormat}
                                onValueChange={(val) => updatePreference("dateFormat", val)}
                            >
                                <SelectTrigger className="h-8 text-xs bg-white">
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (EU)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">User Onboarding</h4>
                    <p className="text-xs text-gray-500">Reset and replay the interactive walkthroughs.</p>
                </div>

                <div className="md:col-span-2 space-y-4 max-w-2xl">
                    <div className="flex items-center justify-between p-4 border border-blue-100 rounded-xl bg-blue-50/30">
                        <div className="flex-1">
                            <Label className="text-xs font-semibold text-gray-900 uppercase tracking-tight">Interactive Walkthrough</Label>
                            <p className="text-[11px] text-gray-500 mt-0.5">Restart the guided tour for the current page you are on.</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[11px] font-bold gap-2 px-4 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                            onClick={() => {
                                // Clear flags for both home and dashboard just in case
                                localStorage.removeItem('cohortly-onboarding-home-seen');
                                localStorage.removeItem('cohortly-onboarding-dashboard-seen');

                                // Dispatch event to catch immediate replay in current view
                                window.dispatchEvent(new CustomEvent('cohortly-replay-tour'));

                                // Close the settings modal is handled by the user clicking outside or we can assume they'll see it after closing
                            }}
                        >
                            <RefreshCcw className="w-3.5 h-3.5" />
                            Replay Tour
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
