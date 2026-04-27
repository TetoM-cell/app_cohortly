"use client";

import React from "react";
import { Sparkles, Info, Clock, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function BillingSettings() {
    return (
        <div className="space-y-10 pb-20 max-w-4xl">
            <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-amber-500 fill-amber-500" />
                    Billing & Access
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                    Manage your account subscription and usage limits.
                </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
                <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-50/50 blur-3xl" />
                <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-blue-50/50 blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="flex-1 space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            <ShieldCheck className="h-3 w-3" />
                            Full Access Enabled
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-4xl font-black text-gray-900 tracking-tight">
                                Cohortly is currently <span className="text-emerald-600">Free</span>.
                            </h4>
                            <p className="text-gray-600 leading-relaxed font-medium max-w-xl">
                                We are currently in a limited-time free access period. During this time, all premium features,
                                including unlimited cohorts and advanced AI-powered application screening, are available to all users at no cost.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 pr-4 border border-gray-100">
                                <div className="rounded-lg bg-white p-2 shadow-sm border border-gray-100">
                                    <Clock className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing Status</p>
                                    <p className="text-xs font-bold text-gray-900">Subject to change at our discretion</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 pr-4 border border-gray-100">
                                <div className="rounded-lg bg-white p-2 shadow-sm border border-gray-100">
                                    <Sparkles className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</p>
                                    <p className="text-xs font-bold text-gray-900">Early Adopter Pro</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-6 flex gap-4">
                <div className="shrink-0 bg-white rounded-xl p-2 h-fit shadow-sm border border-amber-100">
                    <Info className="h-5 w-5 text-amber-600" />
                </div>
                <div className="space-y-1">
                    <h5 className="text-sm font-bold text-amber-900">Important Notice</h5>
                    <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
                        Please note that this free period is temporary. Cohortly reserves the right to introduce
                        subscription plans or usage-based pricing in the future. Users will be notified well in advance
                        of any changes to their account access or pricing structure.
                    </p>
                </div>
            </div>

            <Separator className="opacity-50" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Included Features</h4>
                    <ul className="space-y-3">
                        {[
                            "Unlimited Program Cohorts",
                            "AI-Powered Application Analysis",
                            "Custom Evaluation Rubrics",
                            "Team Collaboration & Review",
                            "Exportable Candidate Data",
                            "Automated Email Notifications"
                        ].map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-center text-center space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Need help?</p>
                    <p className="text-xs font-medium text-gray-600">
                        If you have questions about our future pricing or enterprise needs,
                        please reach out to our support team.
                    </p>
                </div>
            </div>
        </div>
    );
}
