"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface WizardProgressProps {
    currentStep: number;
    steps: { title: string; id: number }[];
    className?: string;
    size?: "default" | "sm";
}

export function WizardProgress({ currentStep, steps, className, size = "default" }: WizardProgressProps) {
    const isSmall = size === "sm";
    return (
        <div className={cn("w-full flex items-center justify-between", size === "default" && "mb-12", className)}>
            {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center relative z-10 group cursor-default">
                            <div className={cn(
                                "rounded-full flex items-center justify-center font-semibold transition-all duration-300 border-2",
                                isSmall ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs",
                                isCompleted
                                    ? "wizard-step-completed"
                                    : isActive
                                        ? "wizard-step-active"
                                        : "border-border bg-background text-muted-foreground"
                            )}>
                                {isCompleted ? <Check className={cn(isSmall ? "w-3 h-3" : "w-4 h-4")} /> : step.id}
                            </div>
                            <span className={cn(
                                "absolute whitespace-nowrap font-medium transition-colors duration-300",
                                isSmall ? "hidden" : "text-xs top-10",
                                isCompleted
                                    ? "text-[var(--wizard-completed-text)]"
                                    : isActive
                                        ? "text-[var(--wizard-active-text)]"
                                        : "text-muted-foreground"
                            )}>{step.title}</span>
                        </div>
                        {index < steps.length - 1 && <div className={cn("flex-1 bg-border relative", isSmall ? "h-[1px] mx-2" : "h-[2px] mx-4")}><div className={cn("absolute inset-0 transition-all duration-500 ease-in-out", isCompleted ? "w-full bg-[var(--wizard-completed-border)]" : "w-0")} /></div>}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
