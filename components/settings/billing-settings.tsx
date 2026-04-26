"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, Loader2 } from "lucide-react";

import type { BillingSnapshot } from "@/lib/billing/snapshot";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface BillingSettingsProps {
    snapshot: BillingSnapshot;
}

function formatDate(value: string | null) {
    if (!value) {
        return null;
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
}

export function BillingSettings({ snapshot }: BillingSettingsProps) {
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const renewalDate = formatDate(snapshot.subscription?.renewsAt ?? null);
    const endDate = formatDate(snapshot.subscription?.endsAt ?? null);
    const trialEndDate = formatDate(snapshot.trial?.endsAt ?? null);
    const currentPlan = useMemo(() => snapshot.plans[0], [snapshot.plans]);
    const currentPlanPriceLabel = snapshot.hasActiveSubscription
        ? snapshot.subscription?.billingInterval === "yearly"
            ? "Annual"
            : currentPlan.prices.monthly
        : snapshot.accessState === "trial"
            ? "Trial"
            : "Pro";
    const currentPlanPeriodLabel = snapshot.hasActiveSubscription
        ? snapshot.subscription?.billingInterval === "yearly"
            ? "commitment, billed monthly"
            : "month"
        : snapshot.accessState === "trial"
            ? "active"
            : "subscription";

    const handleCheckout = async (interval: "monthly" | "yearly") => {
        const plan = "pro";
        setPendingAction(`${plan}-${interval}`);

        try {
            const response = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ plan, interval }),
            });

            const payload = await response.json();

            if (!response.ok || !payload.url) {
                throw new Error(payload.error || "Unable to create checkout.");
            }

            window.location.href = payload.url;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to create checkout.");
            setPendingAction(null);
        }
    };

    const handleOpenPortal = async () => {
        setPendingAction("portal");

        try {
            const response = await fetch("/api/billing/portal", {
                method: "POST",
            });

            const payload = await response.json();

            if (!response.ok || !payload.url) {
                throw new Error(payload.error || "Unable to open billing portal.");
            }

            window.location.href = payload.url;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to open billing portal.");
            setPendingAction(null);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900">Plan & Usage</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                    Manage your Lemon Squeezy subscription, usage, and billing access.
                </p>
            </div>

            {!snapshot.billingConfigured && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    Billing is not fully configured yet. Add the Lemon Squeezy API key, store ID, webhook secret, and
                    variant IDs before taking payments in production.
                </div>
            )}

            <Separator />

            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Current Plan</h4>
                    <p className="text-xs text-gray-500">
                        Subscription state for the account that owns your cohorts.
                    </p>
                </div>

                <div className="md:col-span-2 max-w-2xl space-y-4">
                    <div className="relative overflow-hidden rounded-xl border-2 border-emerald-100 bg-emerald-50/30 p-6">
                        <div className="absolute right-0 top-0 p-4 opacity-5">
                            <CreditCard className="h-24 w-24" />
                        </div>
                        <div className="relative z-10 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-md font-bold text-gray-900">{currentPlan.name}</span>
                                <Badge variant="secondary" className="border-none bg-emerald-500 px-1.5 text-[9px] font-bold text-white">
                                    {(snapshot.accessState === "trial"
                                        ? "trial"
                                        : snapshot.hasActiveSubscription
                                            ? snapshot.subscriptionStatus
                                            : "not subscribed").toUpperCase()}
                                </Badge>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-gray-900">{currentPlanPriceLabel}</span>
                                <span className="text-sm font-medium text-gray-400">/ {currentPlanPeriodLabel}</span>
                            </div>
                            <p className="max-w-sm text-[11px] font-medium text-emerald-700">
                                {snapshot.accessState === "trial"
                                    ? "Your no-card Pro trial is active. Subscribe before it ends to keep uninterrupted access."
                                    : snapshot.hasActiveSubscription
                                    ? currentPlan.description
                                    : "This account does not have an active Pro subscription yet."}
                            </p>
                            {snapshot.accessState === "trial" && trialEndDate ? (
                                <p className="text-[11px] text-gray-600">Trial ends on {trialEndDate}.</p>
                            ) : null}
                            {(renewalDate || endDate) && (
                                <p className="text-[11px] text-gray-600">
                                    {snapshot.subscriptionStatus === "cancelled" && endDate
                                        ? `Access ends on ${endDate}.`
                                        : renewalDate
                                            ? `Next renewal on ${renewalDate}.`
                                            : `Current access ends on ${endDate}.`}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {snapshot.hasActiveSubscription ? (
                            <>
                                <Button
                                    onClick={handleOpenPortal}
                                    disabled={pendingAction === "portal"}
                                    className="bg-gray-900 text-xs font-semibold hover:bg-gray-800"
                                >
                                    {pendingAction === "portal" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                    Manage Subscription
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleOpenPortal}
                                    disabled={pendingAction === "portal"}
                                    className="text-xs font-semibold text-gray-700"
                                >
                                    {snapshot.subscription?.billingInterval === 'monthly' ? 'Upgrade to Annual' : 'Switch to Monthly'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    onClick={() => handleCheckout("monthly")}
                                    disabled={pendingAction !== null || !snapshot.billingConfigured}
                                    className="bg-gray-900 text-xs font-semibold hover:bg-gray-800"
                                >
                                    {pendingAction === "pro-monthly" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                    {snapshot.accessState === "trial" ? "Subscribe Monthly" : "Start Pro Monthly"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleCheckout("yearly")}
                                    disabled={pendingAction !== null || !snapshot.billingConfigured}
                                    className="text-xs"
                                >
                                    {pendingAction === "pro-yearly" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                    {snapshot.accessState === "trial" ? "Subscribe Annual" : "Start Pro Annual"}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Usage & Limits</h4>
                    <p className="text-xs text-gray-500">
                        Current usage against the limits of your active plan.
                    </p>
                </div>

                <div className="md:col-span-2 max-w-2xl space-y-8 pt-2">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold uppercase tracking-wider text-gray-400">Applications This Month</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                {snapshot.usage.currentMonthApplications}
                                {snapshot.usage.applicationLimit ? ` / ${snapshot.usage.applicationLimit}` : ""}
                            </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${snapshot.usage.applicationLimit ? snapshot.usage.applicationUsagePercent : 0}%` }}
                            />
                        </div>
                        <p className="text-[11px] leading-relaxed text-gray-500">
                            Total applications received: {snapshot.usage.totalApplications}. Active cohorts owned:{" "}
                            {snapshot.usage.activePrograms}.
                        </p>
                    </div>


                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Billing Options</h4>
                    <p className="text-xs text-gray-500">
                        Hosted checkout is used for first purchase. Existing subscribers should manage billing in the
                        customer portal.
                    </p>
                </div>

                <div className="md:col-span-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm transition-colors">
                        <div className="flex items-center justify-between">
                            <h5 className="text-sm font-bold text-gray-900">{currentPlan.name}</h5>
                                <Badge variant="secondary" className="border-none bg-emerald-500 text-[9px] font-bold text-white">
                                {snapshot.hasActiveSubscription ? "ACTIVE PRODUCT" : snapshot.accessState === "trial" ? "TRIAL ACCESS" : "AVAILABLE"}
                            </Badge>
                        </div>

                        <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-3xl font-black text-gray-900">
                                {snapshot.hasActiveSubscription && snapshot.subscription?.billingInterval === "yearly"
                                    ? "Annual"
                                    : currentPlan.prices.monthly}
                            </span>
                            <span className="text-xs font-medium text-gray-400">
                                {snapshot.hasActiveSubscription && snapshot.subscription?.billingInterval === "yearly"
                                    ? "/ commitment, billed monthly"
                                    : "/ month"}
                            </span>
                        </div>

                        <p className="mt-2 min-h-10 text-[11px] leading-relaxed text-gray-500">{currentPlan.description}</p>

                        <div className="mt-4 space-y-2">
                            {currentPlan.features.map((feature) => (
                                <div key={feature} className="flex items-start gap-2 text-[11px] text-gray-700">
                                    <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5">
                            {snapshot.hasActiveSubscription ? (
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row items-center gap-2">
                                        <Button
                                            onClick={handleOpenPortal}
                                            disabled={pendingAction !== null}
                                            className="w-full sm:w-auto text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            {pendingAction === "portal" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                            Update Payment Method
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleOpenPortal}
                                            disabled={pendingAction !== null}
                                            className="w-full sm:w-auto text-xs"
                                        >
                                            {snapshot.subscription?.billingInterval === 'monthly' ? 'Upgrade to Annual' : 'Switch to Monthly'}
                                        </Button>
                                        <div className="hidden sm:block flex-1" />
                                        <Button
                                            variant="ghost"
                                            onClick={handleOpenPortal}
                                            disabled={pendingAction !== null}
                                            className="w-full sm:w-auto text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            Cancel Subscription
                                        </Button>
                                    </div>
                                    <p className="text-[10px] leading-relaxed text-gray-500 text-center sm:text-left mt-2">
                                        Billing management, plan changes, and cancellations are securely handled via the Lemon Squeezy portal.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Button
                                        onClick={() => handleCheckout("monthly")}
                                        disabled={pendingAction !== null || !snapshot.billingConfigured}
                                        className="w-full text-xs"
                                    >
                                        {pendingAction === "pro-monthly" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                        Pro Monthly
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleCheckout("yearly")}
                                        disabled={pendingAction !== null || !snapshot.billingConfigured}
                                        className="w-full text-xs"
                                    >
                                        {pendingAction === "pro-yearly" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                        Pro Annual
                                    </Button>
                                    <p className="text-[10px] leading-relaxed text-gray-400">
                                        Annual billing is presented as the discounted Pro commitment option.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Payment Method</h4>
                    <p className="text-xs text-gray-500">
                        Card details are sourced from the latest synced subscription payload.
                    </p>
                </div>

                <div className="md:col-span-2 max-w-2xl pt-2">
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                        <div className="flex items-center gap-4">
                            <div className="rounded-lg border border-gray-100 bg-white p-2">
                                <CreditCard className="h-4 w-5 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    {snapshot.subscription?.cardBrand && snapshot.subscription?.cardLastFour
                                        ? `${snapshot.subscription.cardBrand.toUpperCase()} **** ${snapshot.subscription.cardLastFour}`
                                        : "Payment method available in customer portal"}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {snapshot.subscription?.lemonSubscriptionId
                                        ? "Open Lemon Squeezy to update billing details."
                                        : "No active subscription on this account yet."}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenPortal}
                            disabled={!snapshot.subscription?.lemonCustomerId || pendingAction !== null}
                            className="text-xs"
                        >
                            {pendingAction === "portal" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Open Portal"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
