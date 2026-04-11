"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    Upload,
    X,
    Calendar as CalendarIcon,
    ArrowRight,
    Info,
    Layout,
    FileText,
    BarChart3,
    Image as ImageIcon,
    Target,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { SaveAndExit } from "./save-and-exit";

interface CohortBasicsProps {
    onNext: () => void;
    onSave?: () => Promise<void>;
    formData: {
        name: string;
        description: string;
        type: string;
        openDate: Date | undefined;
        deadline: Date | undefined;
        expectedApps: string;
    };
    setFormData: (data: any) => void;
}

const PROGRAM_TYPES = [
    "Accelerator",
    "Incubator",
    "Grant",
    "Fellowship",
    "University Program",
    "Other",
];

const APPLICATION_VOLUMES = [
    "<100",
    "100–500",
    "500–1000",
    "1000+",
];

export function CohortBasics({ onNext, onSave, formData, setFormData }: CohortBasicsProps) {
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [logo, setLogo] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isFormValid = formData.name && formData.openDate && formData.deadline;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-screen bg-[#FBFCFD] pb-32">
            {/* Header Content */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-8 py-10">
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Create a new cohort
                            </h1>
                            <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
                                Define the foundations of your program. These details will be visible to your applicants.
                            </p>
                        </div>
                        <div className="shrink-0">
                            <SaveAndExit onSave={onSave} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Steps */}
            <div className="max-w-5xl mx-auto px-8 py-12 space-y-8">
                {/* Section 1: Core Identity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-200 rounded-xl p-8"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-blue-50 rounded-lg">
                            <Layout className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Program Identity</h2>
                            <p className="text-sm text-gray-500 mt-1">Name and categorize your new cohort.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                Cohort Name
                            </label>
                            <Input
                                placeholder="e.g. Summer 2026 Accelerator"
                                className="h-[52px] rounded-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-black text-[15px] font-semibold"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                Program Type
                            </label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) => setFormData({ ...formData, type: val })}
                            >
                                <SelectTrigger className="w-full h-[52px] rounded-lg border-gray-200 focus:ring-1 focus:ring-black text-[15px] font-medium bg-white">
                                    <SelectValue placeholder="Select program type..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-200">
                                    {PROGRAM_TYPES.map((type) => (
                                        <SelectItem key={type} value={type} className="rounded-lg">
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </motion.div>

                {/* Section 2: Description & Scope */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border border-gray-200 rounded-xl p-8"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-indigo-50 rounded-lg">
                            <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Program Details</h2>
                            <p className="text-sm text-gray-500 mt-1">Describe what this cohort offers to applicants.</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                Public Description
                            </label>
                            <Textarea
                                placeholder="What is this program about? This will be public on your application page..."
                                className="resize-none min-h-[140px] p-4 rounded-xl border border-gray-200 bg-white focus-visible:ring-1 focus-visible:ring-black outline-none transition-all placeholder:text-gray-400 leading-relaxed text-[15px] font-medium"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                Expected Application Volume
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {APPLICATION_VOLUMES.map((vol) => (
                                    <button
                                        key={vol}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, expectedApps: vol })}
                                        className={cn(
                                            "px-6 py-2.5 rounded-full text-sm font-bold border transition-all",
                                            formData.expectedApps === vol
                                                ? "bg-black text-white border-black"
                                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        {vol}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Section 3: Timeline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border border-gray-200 rounded-xl p-8"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-emerald-50 rounded-lg">
                            <CalendarIcon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Program Timeline</h2>
                            <p className="text-sm text-gray-500 mt-1">Set the application window dates.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                Applications Open
                            </label>
                            <DatePicker
                                date={formData.openDate}
                                setDate={(date) => setFormData({ ...formData, openDate: date })}
                                label="Opening Date"
                                placeholder="Select date"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
                                Application Deadline
                            </label>
                            <DatePicker
                                date={formData.deadline}
                                setDate={(date) => setFormData({ ...formData, deadline: date })}
                                label="Deadline"
                                placeholder="Select date"
                                minDate={formData.openDate}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Section 4: Branding */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border border-gray-200 rounded-xl p-8"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-amber-50 rounded-lg">
                            <ImageIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Program Branding</h2>
                            <p className="text-sm text-gray-500 mt-1">Upload a logo to customize your application page.</p>
                        </div>
                    </div>

                    <div
                        className={cn(
                            "relative w-full h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer overflow-hidden group",
                            logo ? "border-black bg-gray-50/30" : "border-gray-200 hover:border-blue-400 bg-gray-50/20 hover:bg-blue-50/5"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {logo ? (
                            <div className="relative w-full h-full flex items-center justify-center p-6">
                                <img src={logo} alt="Preview" className="max-h-full max-w-full object-contain drop-shadow-md" />
                                <button
                                    className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur shadow-sm text-red-500 rounded-full hover:bg-red-50 transition-all border border-gray-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLogo(null);
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 rounded-full bg-white border border-gray-100 text-gray-400 group-hover:text-blue-600 group-hover:scale-110 transition-all shadow-sm">
                                    <Upload className="w-7 h-7" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[15px] font-bold text-gray-900">Click to upload brand logo</p>
                                    <p className="text-xs text-gray-500 mt-1.5 font-medium">SVG, PNG, JPG (Max 5MB)</p>
                                </div>
                            </>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                </motion.div>

                {/* Final Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="relative bg-black rounded-2xl p-10 text-white overflow-hidden shadow-2xl shadow-gray-200"
                >
                    <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest text-blue-300">
                                <Target className="w-3 h-3" />
                                Step 1 of 4
                            </div>
                            <h2 className="text-3xl font-black">All set with the basics?</h2>
                            <p className="text-gray-400 font-medium max-w-md">Next, we'll design the application form your candidates will fill out.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                            <Button
                                size="lg"
                                className={cn(
                                    "h-14 px-12 rounded-xl font-bold text-lg transition-all flex items-center gap-3",
                                    isFormValid
                                        ? "bg-white text-black hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]"
                                        : "bg-white/10 text-white/30 cursor-not-allowed border border-white/10"
                                )}
                                disabled={!isFormValid}
                                onClick={onNext}
                            >
                                Continue to Form Builder
                                <ArrowRight className="w-5 h-5" />
                            </Button>

                            <button
                                className="h-14 px-8 rounded-xl font-bold text-gray-400 hover:text-white transition-all text-sm uppercase tracking-widest disabled:opacity-30"
                                onClick={async () => {
                                    if (onSave) {
                                        setIsSavingDraft(true);
                                        try {
                                            await onSave();
                                            toast.success("Draft saved successfully");
                                        } finally {
                                            setIsSavingDraft(false);
                                        }
                                    }
                                }}
                                disabled={isSavingDraft}
                            >
                                {isSavingDraft ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </div>
                                ) : "Save as Draft"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
