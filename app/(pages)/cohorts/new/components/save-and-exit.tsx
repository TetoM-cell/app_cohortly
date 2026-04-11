"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface SaveAndExitProps {
    onSave?: () => Promise<void> | void;
}

export function SaveAndExit({ onSave }: SaveAndExitProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = React.useState(false);

    const handleExit = async () => {
        if (onSave) {
            setIsSaving(true);
            try {
                await onSave();
                toast.success("Progress saved as draft");
                router.push("/dashboard");
            } catch (error) {
                console.error("Exit save error:", error);
            } finally {
                setIsSaving(false);
            }
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                className="text-gray-500 hover:text-black hover:bg-gray-100 flex items-center gap-2 px-3 py-2 h-auto text-sm font-medium rounded-lg transition-colors"
                onClick={handleExit}
                disabled={isSaving}
            >
                {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <ArrowLeft className="w-4 h-4" />
                )}
                Back to dashboard
            </Button>

            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-help transition-colors">
                            <Info className="w-3.5 h-3.5" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-[200px] text-xs font-medium">
                        Your progress is automatically saved as a draft when you leave.
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
