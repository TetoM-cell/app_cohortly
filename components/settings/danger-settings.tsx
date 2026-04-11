"use client";

import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function DangerSettings() {
    const handleDeleteAccount = () => {
        toast.error("Account deletion is disabled for this preview.");
    };

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h3 className="text-xl font-bold tracking-tight text-red-600">Danger Zone</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Irreversible and destructive actions.
                </p>
            </div>

            <Separator className="bg-red-100" />

            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Delete Account</h4>
                    <p className="text-xs text-gray-500">Permanently remove all your data.</p>
                </div>

                <div className="md:col-span-2 max-w-2xl">
                    <div className="p-6 border border-red-100 rounded-xl bg-red-50/30 space-y-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-red-900">Are you absolutely sure?</p>
                                <p className="text-xs text-red-700 leading-relaxed">
                                    This action will disconnect all your cohorts, remove all applicants, and delete your profile permanently.
                                    This cannot be undone.
                                </p>
                            </div>
                        </div>
                        <Button 
                            variant="destructive" 
                            className="h-9 font-bold text-xs uppercase tracking-wider px-6"
                            onClick={handleDeleteAccount}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete My Account
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
