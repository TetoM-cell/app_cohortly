"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
    CreditCard,
    Download,
    Check,
    Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function BillingSettings() {
    const [isLoading, setIsLoading] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    // Mock Subscription Data
    const subscription = {
        plan: "Growth",
        status: "active",
        price: "$49",
        period: "month",
        nextBilling: "Feb 24, 2026",
        usage: {
            current: 347,
            limit: 500,
            unit: "applications"
        }
    };

    // Mock Payment Method
    const paymentMethod = {
        brand: "Visa",
        last4: "4242",
        expiry: "12/28"
    };

    // Mock Invoices
    const invoices = [
        { id: "INV-2024-001", date: "Jan 24, 2026", amount: "$49.00", status: "Paid" },
        { id: "INV-2023-012", date: "Dec 24, 2025", amount: "$49.00", status: "Paid" },
        { id: "INV-2023-011", date: "Nov 24, 2025", amount: "$49.00", status: "Paid" },
        { id: "INV-2023-010", date: "Oct 24, 2025", amount: "$49.00", status: "Paid" },
    ];

    const plans = [
        {
            name: "Free",
            price: "$0",
            description: "For hobbyists and side projects",
            features: ["Up to 50 applications", "Basic analytics", "Community support"],
            current: false,
        },
        {
            name: "Starter",
            price: "$29",
            description: "For small teams and startups",
            features: ["Up to 200 applications", "Advanced analytics", "Email support", "Custom domains"],
            current: false,
        },
        {
            name: "Growth",
            price: "$49",
            description: "For growing companies",
            features: ["Up to 500 applications", "Premium analytics", "Priority support", "API access"],
            current: true,
        },
    ];

    const handleUpdatePaymentMethod = async () => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsLoading(false);
        toast.info("This would open Stripe/payment provider portal");
    };

    const handleDownloadInvoice = (invoiceId: string) => {
        toast.success(`Downloading invoice ${invoiceId}...`);
    };

    const handlePlanSelect = async (planName: string) => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsLoading(false);
        setIsUpgradeModalOpen(false);
        toast.success(`Successfully switched to ${planName} plan`);
    };

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900">Beta Status & Usage</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    Cohortly is currently in early access. All premium features are unlocked for beta testers.
                </p>
            </div>

            <Separator />

            {/* Current Plan - Beta */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Current Access</h4>
                    <p className="text-xs text-gray-500">
                        Information about your current account privileges.
                    </p>
                </div>

                <div className="md:col-span-2 max-w-2xl space-y-4">
                    <div className="p-6 border-2 border-emerald-100 rounded-xl bg-emerald-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <CreditCard className="w-24 h-24" />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <div className="flex items-center gap-2">
                                <span className="text-md font-bold text-gray-900">Early Access Beta</span>
                                <Badge variant="secondary" className="bg-emerald-500 text-white border-none text-[9px] font-bold px-1.5 h-3.5 animate-pulse">
                                    ACTIVE
                                </Badge>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-gray-900">$0</span>
                                <span className="text-sm text-gray-400 font-medium">/ forever during beta</span>
                            </div>
                            <p className="text-[11px] text-emerald-700 font-medium max-w-sm">
                                Thank you for being an early adopter! You have full access to all industrial-grade tools and AI features.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Usage */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Fair Usage & Limits</h4>
                    <p className="text-xs text-gray-500">
                        Details on resource consumption and platform stability.
                    </p>
                </div>

                <div className="md:col-span-2 max-w-2xl space-y-8 pt-2">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-400 uppercase tracking-wider">Applications Received</span>
                            <span className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">
                                Unlimited
                            </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[15%] transition-all" />
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            We do not charge for application volume during the beta period. Scale your programs as needed.
                        </p>
                    </div>

                    <div className="space-y-3 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-amber-700 uppercase tracking-wider">AI review usage</span>
                                <Badge variant="outline" className="text-[9px] border-amber-200 text-amber-600 bg-white">Fair Usage</Badge>
                            </div>
                        </div>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            To prevent technical abuse of our AI infrastructure, we apply soft daily limits on automated reviews. If you reach this limit, reviews will be queued for the next 24-hour window.
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Payment Method - Disabled for Beta */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-400">Payment Methods</h4>
                    <p className="text-xs text-gray-400">
                        Payments are disabled during the beta phase.
                    </p>
                </div>

                <div className="md:col-span-2 max-w-2xl pt-2 opacity-50 grayscale pointer-events-none">
                    <div className="flex items-center justify-between p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white rounded-lg border border-gray-100">
                                <CreditCard className="w-5 h-4 text-gray-300" />
                            </div>
                            <p className="text-xs font-medium text-gray-400 italic">No payment method required</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
