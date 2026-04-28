"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpdateGuardian() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [initialVersion, setInitialVersion] = useState<string | null>(null);

    useEffect(() => {
        // Get initial version on mount
        const fetchInitialVersion = async () => {
            try {
                const res = await fetch("/api/version");
                const data = await res.json();
                setInitialVersion(data.version);
            } catch (err) {
                console.warn("Failed to fetch initial version:", err);
            }
        };

        fetchInitialVersion();

        // Check for updates every 5 minutes
        const interval = setInterval(async () => {
            if (dismissed || updateAvailable) return;

            try {
                const res = await fetch("/api/version");
                const data = await res.json();
                
                if (initialVersion && data.version !== initialVersion) {
                    setUpdateAvailable(true);
                }
            } catch (err) {
                console.warn("Update check failed:", err);
            }
        }, 1000 * 60 * 5); // 5 minutes

        return () => clearInterval(interval);
    }, [initialVersion, updateAvailable, dismissed]);

    const handleReload = () => {
        window.location.reload();
    };

    const handleDismiss = () => {
        setDismissed(true);
        setUpdateAvailable(false);
    };

    return (
        <AnimatePresence>
            {updateAvailable && !dismissed && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full"
                >
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-blue-100 dark:border-blue-900/30 rounded-3xl p-5 shadow-2xl shadow-blue-500/10 flex flex-col gap-4 overflow-hidden relative group">
                        {/* Background subtle glow */}
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full" />
                        
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100/50 dark:border-blue-800/30">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                            </div>
                            
                            <div className="flex-1 space-y-1">
                                <h3 className="font-bold text-gray-900 dark:text-white text-base tracking-tight">
                                    Update Available
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                    A newer version of Cohortly is ready. Update now for the latest features.
                                </p>
                            </div>
                            
                            <button 
                                onClick={handleDismiss}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 mt-1">
                            <Button
                                onClick={handleReload}
                                className="flex-1 h-11 bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 text-white rounded-xl font-bold text-sm shadow-lg shadow-black/5 active:scale-95 transition-all gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Now
                            </Button>
                            
                            <Button
                                variant="ghost"
                                onClick={handleDismiss}
                                className="px-5 h-11 rounded-xl font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-all"
                            >
                                Later
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
