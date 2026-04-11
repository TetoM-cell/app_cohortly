"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";


interface WizardProgressProps {
    currentStep: number;
    steps: { title: string; id: number }[];
    className?: string; // Turbo-charge: Added className prop
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
                            <div
                                className={cn(
                                    "rounded-full flex items-center justify-center font-semibold transition-all duration-300 border-2",
                                    isSmall ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs",
                                    isActive
                                        ? "bg-black border-black text-white"
                                        : isCompleted
                                            ? "bg-black border-black text-white"
                                            : "bg-white border-gray-200 text-gray-400"
                                )}
                            >
                                {isCompleted ? <Check className={cn(isSmall ? "w-3 h-3" : "w-4 h-4")} /> : step.id}
                            </div>
                            {/* Make text hidden in small mode until hover if space is tight, usually better to keep it but adjust position */}
                            <span
                                className={cn(
                                    "absolute whitespace-nowrap font-medium transition-colors duration-300",
                                    isSmall ? "hidden" : "text-xs top-10",
                                    isActive ? "text-black" : "text-gray-400"
                                )}
                            >
                                {step.title}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={cn(
                                "flex-1 bg-gray-100 relative",
                                isSmall ? "h-[1px] mx-2" : "h-[2px] mx-4"
                            )}>
                                <div
                                    className="absolute inset-0 bg-black transition-all duration-500 ease-in-out"
                                    style={{
                                        width: isCompleted ? "100%" : "0%",
                                    }}
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
