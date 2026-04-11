"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

interface Step {
    element: string;
    title: string;
    intro: string;
    position?: "top" | "bottom" | "left" | "right";
}

const homeSteps: Step[] = [
    {
        element: "#home-greeting",
        title: "Welcome to your command center",
        intro: "This is where you'll see a bird's-eye view of all your programs and candidate activity.",
        position: "bottom",
    },
    {
        element: "#sidebar-search",
        title: "Find anything instantly",
        intro: "Global search lets you jump between cohorts, applicants, and settings with a few keystrokes.",
        position: "right",
    },
    {
        element: "#home-stats",
        title: "Global Benchmarks",
        intro: "Track your overall performance across all active programs at a glance.",
        position: "bottom",
    },
    {
        element: "#home-cta-card",
        title: "Your first priority",
        intro: "Ready to go? Create a cohort here to define your forms, rubrics, and start accepting candidates.",
        position: "bottom",
    },
    {
        element: "#sidebar-resources",
        title: "Need help?",
        intro: "Documentation, feature requests, and support are always just one click away.",
        position: "right",
    },
];

const dashboardSteps: Step[] = [
    {
        element: "#dashboard-stats",
        title: "Cohort Intelligence",
        intro: "Specific metrics for this program, helping you track progress toward your hiring or selection targets.",
        position: "bottom",
    },
    {
        element: "#datatable-toolbar",
        title: "The Toolbox",
        intro: "Bulk-manage applicants, filter by score, or search for specific profiles with ease.",
        position: "bottom",
    },
    {
        element: "#dashboard-table",
        title: "AI-Powered Pipeline",
        intro: "The magic happens here. Once applications roll in, AI scores them based on your rubric so you can focus on the best gems.",
        position: "top",
    },
];

export function SpotlightTour() {
    const pathname = usePathname();
    const [currentStep, setCurrentStep] = useState(-1);
    const [isVisible, setIsVisible] = useState(false);
    const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
    const [activeSteps, setActiveSteps] = useState<Step[]>([]);
    const [stage, setStage] = useState<"home" | "dashboard" | null>(null);

    useEffect(() => {
        // Determine stage based on pathname
        let currentStage: "home" | "dashboard" | null = null;
        if (pathname === "/home") currentStage = "home";
        else if (pathname === "/dashboard") currentStage = "dashboard";

        if (!currentStage) {
            setIsVisible(false);
            return;
        }

        const seenKey = `cohortly-onboarding-${currentStage}-seen`;
        const hasSeenTour = localStorage.getItem(seenKey);

        if (!hasSeenTour) {
            const timer = setTimeout(() => {
                setStage(currentStage);
                setActiveSteps(currentStage === "home" ? homeSteps : dashboardSteps);
                setIsVisible(true);
                setCurrentStep(0);
            }, 1500);
            return () => clearTimeout(timer);
        }

        // Check for replay trigger
        const handleReplay = () => {
             setStage(currentStage);
             setActiveSteps(currentStage === "home" ? homeSteps : dashboardSteps);
             setIsVisible(true);
             setCurrentStep(0);
        };

        window.addEventListener('cohortly-replay-tour', handleReplay);
        return () => window.removeEventListener('cohortly-replay-tour', handleReplay);
    }, [pathname]);

    // Update rect with high frequency while visible to catch layout shifts
    useEffect(() => {
        if (currentStep === -1 || !isVisible || activeSteps.length === 0) return;

        let rafId: number;
        const update = () => {
            const el = document.querySelector(activeSteps[currentStep].element);
            if (el) {
                const newRect = el.getBoundingClientRect();
                setRect({
                    left: newRect.left,
                    top: newRect.top,
                    width: newRect.width,
                    height: newRect.height,
                });
            } else {
                // If element isn't found, maybe skip or wait
            }
            rafId = requestAnimationFrame(update);
        };

        update();
        return () => cancelAnimationFrame(rafId);
    }, [currentStep, isVisible, activeSteps]);

    useEffect(() => {
        if (currentStep >= 0 && isVisible && activeSteps.length > 0) {
            const el = document.querySelector(activeSteps[currentStep].element);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [currentStep, isVisible, activeSteps]);

    const handleClose = () => {
        setIsVisible(false);
        if (stage) {
            localStorage.setItem(`cohortly-onboarding-${stage}-seen`, "true");
        }
    };

    const next = () => {
        if (currentStep < activeSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const prev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (!isVisible || currentStep === -1 || !rect || activeSteps.length === 0) return null;

    const spotlightPadding = 12;
    const spotlightX = rect.left - spotlightPadding;
    const spotlightY = rect.top - spotlightPadding;
    const spotlightWidth = rect.width + spotlightPadding * 2;
    const spotlightHeight = rect.height + spotlightPadding * 2;

    const getTooltipStyle = () => {
        const pos = activeSteps[currentStep].position || "bottom";
        const gap = 20;
        const tooltipWidth = 320;
        const screenPadding = 20;
        const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

        let left = spotlightX + spotlightWidth / 2 - tooltipWidth / 2;
        let top = spotlightY + spotlightHeight + gap;

        if (pos === "right") {
            left = spotlightX + spotlightWidth + gap;
            top = spotlightY + spotlightHeight / 2 - 100;
        } else if (pos === "top") {
            top = spotlightY - gap - 240; 
        }

        // Clamp
        if (left < screenPadding) left = screenPadding;
        if (left + tooltipWidth > winWidth - screenPadding) {
            left = winWidth - tooltipWidth - screenPadding;
        }
        if (top < screenPadding) top = screenPadding;
        if (top > winHeight - 300) top = winHeight - 350;

        return {
            left: `${left}px`,
            top: `${top}px`,
            width: `${tooltipWidth}px`,
        };
    };

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-none">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <mask id="tour-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <motion.rect
                            animate={{
                                x: spotlightX,
                                y: spotlightY,
                                width: spotlightWidth,
                                height: spotlightHeight,
                            }}
                            transition={{ type: "spring", damping: 25, stiffness: 150 }}
                            rx="20"
                            fill="black"
                        />
                    </mask>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.25)"
                    mask="url(#tour-mask)"
                    className="pointer-events-auto cursor-default"
                />
            </svg>

            <motion.div
                animate={{
                    x: spotlightX,
                    y: spotlightY,
                    width: spotlightWidth,
                    height: spotlightHeight,
                }}
                transition={{ type: "spring", damping: 25, stiffness: 150 }}
                className="absolute border-[2.5px] border-blue-500 rounded-[20px] shadow-[0_0_30px_rgba(59,130,246,0.5),inset_0_0_20px_rgba(59,130,246,0.3)] pointer-events-none ring-[10px] ring-blue-500/10"
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={`${stage}-${currentStep}`}
                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 15 }}
                    style={getTooltipStyle()}
                    className="fixed pointer-events-auto bg-white/95 backdrop-blur-2xl rounded-[28px] p-7 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] border border-white/50 select-none flex flex-col"
                >
                    <div className="flex gap-1.5 mb-6">
                        {activeSteps.map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    width: i === currentStep ? 28 : 6,
                                    backgroundColor: i === currentStep ? "#3B82F6" : "#E2E8F0"
                                }}
                                className="h-1.5 rounded-full"
                            />
                        ))}
                    </div>

                    <h3 className="text-xl font-black text-gray-900 mb-3 leading-tight tracking-tight">
                        {activeSteps[currentStep].title}
                    </h3>
                    <p className="text-[15px] text-gray-600 mb-8 leading-relaxed font-semibold opacity-90">
                        {activeSteps[currentStep].intro}
                    </p>

                    <div className="flex items-center justify-between mt-auto">
                        <button
                            onClick={handleClose}
                            className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-[0.1em]"
                        >
                            Skip
                        </button>

                        <div className="flex items-center gap-2.5">
                            {currentStep > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={prev}
                                    className="h-10 w-10 p-0 rounded-full hover:bg-gray-100 text-gray-500 transition-all hover:scale-105"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={next}
                                className="h-11 px-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[14px] font-bold gap-2 group shadow-xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                            >
                                {currentStep === activeSteps.length - 1 ? "Start Now" : "Continue"}
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100/80 text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
