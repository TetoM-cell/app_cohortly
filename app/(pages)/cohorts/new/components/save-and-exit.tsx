"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
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
                size="sm"
                onClick={handleExit}
                disabled={isSaving}
            >
                {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <ArrowLeft className="h-4 w-4" />
                )}
                Back to dashboard
            </Button>

            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="text-muted-foreground cursor-help text-xs">ⓘ</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start">
                        Your progress is automatically saved as a draft when you leave.
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
