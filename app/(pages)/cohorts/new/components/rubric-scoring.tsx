"use client";

import React, { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Plus, GripVertical, Trash2, AlertCircle, Sparkles, Loader2, CheckCircle, XCircle, Clock, ChevronDown, Target, Zap, ArrowRight, Info, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
    RUBRIC_TEMPLATES,
    getSuggestedTemplateId,
    RubricTemplate as RubricTemplateType,
    CriterionTemplate
} from "../constants/rubric-templates";
import { WizardProgress } from "./wizard-progress";
import { SaveAndExit } from "./save-and-exit";

interface Criterion {
    id: string;
    name: string;
    weight: number;
    description: string;
}

interface RubricScoringProps {
    onNext: () => void;
    onBack: () => void;
    onSave?: () => Promise<void>;
    programType: string;
    steps?: { title: string; id: number }[];
    currentStep?: number;
    criteria: Criterion[];
    setCriteria: React.Dispatch<React.SetStateAction<Criterion[]>>;
    thresholds: {
        shortlist: number;
        reject: number;
        enabled: boolean;
    };
    setThresholds: React.Dispatch<React.SetStateAction<{
        shortlist: number;
        reject: number;
        enabled: boolean;
    }>>;
}

export function RubricScoring({
    onNext,
    onBack,
    onSave,
    programType,
    steps,
    currentStep = 3,
    criteria,
    setCriteria,
    thresholds,
    setThresholds
}: RubricScoringProps) {
    const autoShortlistThreshold = thresholds.shortlist;
    const setAutoShortlistThreshold = (val: number) => setThresholds(prev => ({ ...prev, shortlist: val }));
    const autoRejectThreshold = thresholds.reject;
    const setAutoRejectThreshold = (val: number) => setThresholds(prev => ({ ...prev, reject: val }));
    const smartThresholdsEnabled = thresholds.enabled;
    const setSmartThresholdsEnabled = (val: boolean) => setThresholds(prev => ({ ...prev, enabled: val }));

    // Template loading state
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingTemplate, setPendingTemplate] = useState<RubricTemplateType | null>(null);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

    // AI Tester state
    const [sampleText, setSampleText] = useState("");
    const [isScoring, setIsScoring] = useState(false);
    const [scoringResults, setScoringResults] = useState<{
        overallScore: number;
        criterionScores: Record<string, { score: number; explanation: string }>;
    } | null>(null);

    // Template data
    const templates = Object.values(RUBRIC_TEMPLATES);

    // Initial suggested template
    useEffect(() => {
        if (criteria.length === 0) {
            const suggestedId = getSuggestedTemplateId(programType);
            const template = RUBRIC_TEMPLATES[suggestedId];
            if (template) {
                const newCriteria = template.criteria.map((c: CriterionTemplate, index: number) => ({
                    id: String(Date.now() + index),
                    name: c.name,
                    weight: c.weight,
                    description: c.description,
                }));
                setCriteria(newCriteria);
            }
        }
    }, [programType]); // React to programType changes if criteria is empty

    // Function to use a template
    const handleTemplateSelect = (template: RubricTemplateType) => {
        // If we have criteria (more than a default empty one), show confirmation
        if (criteria.length > 0 && !(criteria.length === 1 && criteria[0].name === "New Criterion" && criteria[0].weight === 0)) {
            setPendingTemplate(template);
            setIsConfirmModalOpen(true);
        } else {
            applyTemplate(template);
        }
    };

    const applyTemplate = (template: RubricTemplateType) => {
        const newCriteria = template.criteria.map((c: CriterionTemplate, index: number) => ({
            id: String(Date.now() + index),
            name: c.name,
            weight: c.weight,
            description: c.description,
        }));

        setCriteria(newCriteria);

        // Show success toast
        setToast({ message: `Rubric loaded: ${template.title}`, visible: true });
        setTimeout(() => setToast({ message: "", visible: false }), 3000);

        // Scroll to rubric table
        setTimeout(() => {
            const rubricTable = document.getElementById('rubric-table');
            if (rubricTable) {
                rubricTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);

        setIsConfirmModalOpen(false);
        setPendingTemplate(null);
    };

    // Calculate total weight
    const totalWeight = useMemo(() => {
        return criteria.reduce((sum, c) => sum + c.weight, 0);
    }, [criteria]);

    // Mock example scores for the live calculation
    const exampleScores: Record<string, number> = {};

    // Calculate example overall score
    const exampleOverallScore = useMemo(() => {
        if (totalWeight === 0) return 0;
        const weightedSum = criteria.reduce((sum, c) => {
            return sum + (c.weight / 100) * (exampleScores[c.id] || 0);
        }, 0);
        return Math.round(weightedSum);
    }, [criteria, totalWeight]);

    const addCriterion = () => {
        const newId = String(Date.now());
        setCriteria([
            ...criteria,
            { id: newId, name: "New Criterion", weight: 0, description: "" },
        ]);
    };

    const updateCriterion = (id: string, field: keyof Criterion, value: string | number) => {
        if (field === "weight") {
            const numValue = Math.max(0, typeof value === "string" ? parseInt(value) || 0 : value);
            const otherTotal = criteria.reduce((sum, c) => c.id === id ? sum : sum + c.weight, 0);

            // If the new value would push us over 100, cap it at the remaining available weight
            const allowedValue = Math.min(numValue, 100 - otherTotal);

            setCriteria(criteria.map(c => c.id === id ? { ...c, weight: allowedValue } : c));
        } else {
            setCriteria(criteria.map(c => c.id === id ? { ...c, [field]: value } : c));
        }
    };

    const deleteCriterion = (id: string) => {
        setCriteria(criteria.filter(c => c.id !== id));
    };

    // Mock AI scoring function
    const scoreSample = async () => {
        if (!sampleText.trim()) return;

        setIsScoring(true);
        setScoringResults(null);

        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate mock scores based on text characteristics
        const textLength = sampleText.length;
        const hasNumbers = /\d/.test(sampleText);
        const hasKeywords = /team|traction|innovation|market|growth|revenue|user/i.test(sampleText);

        const criterionScores: Record<string, { score: number; explanation: string }> = {};

        criteria.forEach(criterion => {
            // Generate realistic score (60-95 range with some randomness)
            let baseScore = 70 + Math.random() * 20;

            // Adjust based on text characteristics
            if (textLength > 500) baseScore += 5;
            if (hasNumbers) baseScore += 3;
            if (hasKeywords) baseScore += 5;

            // Add criterion-specific adjustments
            if (criterion.name.toLowerCase().includes('team') && /founder|ceo|experience|years/i.test(sampleText)) {
                baseScore += 8;
            }
            if (criterion.name.toLowerCase().includes('traction') && /revenue|users|growth|customers/i.test(sampleText)) {
                baseScore += 8;
            }
            if (criterion.name.toLowerCase().includes('innovation') && /technology|ai|patent|unique/i.test(sampleText)) {
                baseScore += 8;
            }

            const score = Math.min(95, Math.round(baseScore));

            // Generate explanation
            const explanations = [
                `Strong evidence of ${criterion.name.toLowerCase()} with clear metrics and examples provided.`,
                `Demonstrates solid ${criterion.name.toLowerCase()} potential with room for further development.`,
                `Good foundation in ${criterion.name.toLowerCase()}, though additional details would strengthen the case.`,
                `Compelling ${criterion.name.toLowerCase()} story with quantifiable achievements highlighted.`,
            ];

            criterionScores[criterion.id] = {
                score,
                explanation: explanations[Math.floor(Math.random() * explanations.length)]
            };
        });

        // Calculate weighted overall score
        const overallScore = Math.round(
            criteria.reduce((sum, c) => {
                return sum + (c.weight / 100) * (criterionScores[c.id]?.score || 0);
            }, 0)
        );

        setScoringResults({ overallScore, criterionScores });
        setIsScoring(false);
    };

    // Determine threshold action
    // Auto-accept intentionally disabled to prevent irreversible decisions without human review
    const getThresholdAction = (score: number) => {
        if (score >= autoShortlistThreshold) {
            return { label: "Auto-shortlist", color: "green", icon: UserPlus };
        } else if (score < autoRejectThreshold) {
            return { label: "Auto-reject", color: "green", icon: XCircle };
        } else {
            return { label: "Needs manual review", color: "amber", icon: Clock };
        }
    };

    return (
        <div className="min-h-screen bg-[#FBFCFD]">
            {/* Header Content */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-8 py-6">
                    {/* Progress Bar */}
                    {steps && (
                        <div className="max-w-2xl mx-auto mb-8">
                            <WizardProgress currentStep={currentStep} steps={steps} />
                        </div>
                    )}

                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                Evaluation Rubric
                            </h1>
                            <p className="text-base text-gray-500 max-w-2xl leading-relaxed">
                                Define how the AI should evaluate each application.
                            </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-3">
                            <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-900">
                                Back
                            </Button>
                            <SaveAndExit onSave={onSave} />
                            <Button
                                onClick={onNext}
                                className="bg-black hover:bg-gray-800 text-white rounded-xl px-6 font-bold shadow-lg shadow-gray-200"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-8 py-6 space-y-6">
                {/* Start with a proven rubric template */}
                <div className="space-y-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Start with a proven rubric template</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Choose a pre-built evaluation framework used by top programs — or start blank
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template) => (
                            <motion.div
                                key={template.id}
                                whileHover={{ scale: 1.01, translateY: -2 }}
                                className="group relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                            >
                                {template.tag && (
                                    <span className="absolute top-4 right-4 px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-blue-100">
                                        {template.tag}
                                    </span>
                                )}

                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-colors",
                                    template.color === "orange" ? "bg-orange-50" :
                                        template.color === "blue" ? "bg-blue-50" :
                                            template.color === "purple" ? "bg-purple-50" :
                                                template.color === "indigo" ? "bg-indigo-50" :
                                                    template.color === "green" ? "bg-green-50" : "bg-gray-50"
                                )}>
                                    {template.icon}
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-3">{template.title}</h3>

                                <ul className="space-y-2 mb-6 flex-1">
                                    {template.criteria.slice(0, 5).map((c, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <span className="font-medium text-gray-800">{c.name}</span>
                                            <span className="text-gray-400">{c.weight}%</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    onClick={() => handleTemplateSelect(template)}
                                    variant="outline"
                                    className="w-full h-10 border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all group-hover:shadow-md"
                                >
                                    Use this rubric
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Live Example Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl shadow-blue-100 overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-20 -mb-20 blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                                <Sparkles className="w-4 h-4 text-blue-200" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold">Real-time Score Calculation</h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {criteria.map((c, idx) => (
                                        <div key={c.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-sm">
                                            <span className="text-blue-200/60 font-mono">{c.weight}%</span>
                                            <span className="font-semibold truncate max-w-[120px]">{c.name || "Untitled"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col items-center md:items-end justify-center py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <div className="text-center px-10">
                                    <p className="text-xs font-black uppercase tracking-[3px] text-blue-200/60 mb-1">Estimated Final Score</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-6xl font-black">{exampleOverallScore}</span>
                                        <span className="text-2xl text-blue-200/40">/100</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {totalWeight !== 100 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-8 flex items-center justify-center gap-3 px-4 py-2 bg-amber-400 text-black rounded-xl font-bold shadow-lg"
                            >
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm uppercase tracking-wider">Weights must sum to 100% (Current: {totalWeight}%)</span>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Rubric Builder Table */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    id="rubric-table"
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden scroll-mt-6"
                >
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-50 rounded-lg">
                                <Plus className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Criteria Builder</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-9 px-3 border-gray-200 hover:border-black hover:bg-transparent text-gray-700 font-bold rounded-xl flex items-center gap-2 text-xs">
                                        Presets
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border-gray-100">
                                    <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                                        Quick Templates
                                    </div>
                                    {templates.map((template) => (
                                        <DropdownMenuItem
                                            key={template.id}
                                            onClick={() => handleTemplateSelect(template)}
                                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-gray-50 focus:bg-gray-50 outline-none transition-colors border-none"
                                        >
                                            <span className="text-base">{template.icon}</span>
                                            <span className="text-xs font-bold text-gray-800">{template.title}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                onClick={addCriterion}
                                className="h-9 px-4 flex items-center gap-2 bg-black text-white hover:bg-gray-800 rounded-xl text-xs font-bold transition-all shadow-md shadow-gray-100"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New Criterion
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#FBFCFD] border-b border-gray-100">
                                <tr>
                                    <th className="w-12"></th>
                                    <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                        Metric Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest w-40">
                                        Weight
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                        Instructions for AI
                                    </th>
                                    <th className="w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <AnimatePresence initial={false}>
                                    {criteria.map((criterion) => (
                                        <motion.tr
                                            key={criterion.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="group hover:bg-[#F8FAFC] transition-colors"
                                        >
                                            <td className="px-4 py-3.5">
                                                <GripVertical className="w-4 h-4 text-gray-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </td>
                                            <td className="px-6 py-3.5 min-w-[200px]">
                                                <input
                                                    type="text"
                                                    value={criterion.name}
                                                    onChange={(e) => updateCriterion(criterion.id, "name", e.target.value)}
                                                    className="w-full font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-black/5 rounded-lg px-3 py-2 -mx-3 transition-all placeholder:text-gray-300"
                                                    placeholder="e.g. Founder Experience"
                                                />
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="relative flex items-center w-28">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={criterion.weight}
                                                        onChange={(e) => updateCriterion(criterion.id, "weight", parseInt(e.target.value) || 0)}
                                                        className="w-full font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-center pr-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <span className="absolute right-4 text-[13px] font-black text-gray-400 pointer-events-none">%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <input
                                                    type="text"
                                                    value={criterion.description}
                                                    onChange={(e) => updateCriterion(criterion.id, "description", e.target.value.substring(0, 255))}
                                                    className="w-full text-[14px] text-gray-600 font-medium bg-white/50 border border-transparent hover:border-gray-200 focus:bg-white focus:border-gray-300 focus:ring-0 outline-none rounded-xl px-4 py-2 transition-all placeholder:text-gray-300"
                                                    placeholder="Tell the AI what specifically to look for..."
                                                />
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <button
                                                    onClick={() => deleteCriterion(criterion.id)}
                                                    className="p-2.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {criteria.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="p-4 bg-gray-50 rounded-full mb-4">
                                                    <Plus className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <p className="text-gray-900 font-bold">No criteria defined</p>
                                                <p className="text-sm text-gray-500">Pick a preset above or add a manual criterion to start scoring.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-8 py-6 bg-[#F8FAFC] border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Total Distribution</span>
                            <div className="flex items-center gap-4">
                                <div className="h-2 w-48 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-500",
                                            totalWeight === 100 ? "bg-emerald-500" : "bg-amber-500"
                                        )}
                                        style={{ width: `${Math.min(100, totalWeight)}%` }}
                                    />
                                </div>
                                <span className={cn(
                                    "text-xl font-black",
                                    totalWeight === 100 ? "text-emerald-600" : "text-amber-600"
                                )}>
                                    {totalWeight}%
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
                >
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-50 rounded-lg">
                                <Target className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Automation Settings</h2>
                            </div>
                        </div>
                        <Switch
                            checked={smartThresholdsEnabled}
                            onCheckedChange={setSmartThresholdsEnabled}
                            className="bg-gray-200 data-[state=checked]:bg-black"
                        />
                    </div>

                    <AnimatePresence>
                        {smartThresholdsEnabled && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-6 overflow-hidden"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                    {/* Auto-Shortlist */}
                                    <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <UserPlus className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <h3 className="text-[13px] font-black uppercase tracking-widest text-emerald-800">Auto-Shortlist</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-emerald-600/60 font-mono">SCORE ≥</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={autoShortlistThreshold}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const clamped = Math.min(100, Math.max(0, val));
                                                        setAutoShortlistThreshold(clamped);
                                                    }}
                                                    className="w-20 h-10 text-center font-black border-emerald-200 focus-visible:ring-emerald-500 rounded-xl"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-emerald-900/60 font-medium leading-relaxed">
                                            Any application that receives an overall score of {autoShortlistThreshold} or higher will be moved to "Shortlisted" automatically.
                                        </p>
                                    </div>

                                    {/* Auto-Reject */}
                                    <div className="p-6 bg-red-50/50 border border-red-100 rounded-2xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                </div>
                                                <h3 className="text-[13px] font-black uppercase tracking-widest text-red-800">Auto-Reject</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-red-600/60 font-mono">SCORE &lt;</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={autoRejectThreshold}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const clamped = Math.min(100, Math.max(0, val));
                                                        setAutoRejectThreshold(clamped);
                                                    }}
                                                    className="w-20 h-10 text-center font-black border-red-200 focus-visible:ring-red-500 rounded-xl"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-red-900/60 font-medium leading-relaxed">
                                            Applications scoring below {autoRejectThreshold} will be automatically declined. They'll show up in your "Rejected" tab.
                                        </p>
                                    </div>

                                    {/* Manual Review Range Info */}
                                    <div className="md:col-span-2 p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">Manual Review Window</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900 px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm">
                                            {autoRejectThreshold} - {autoShortlistThreshold - 1} points
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
                >
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">AI Testing Sandbox</h2>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Textarea Input Container */}
                        <div className="relative group">
                            <textarea
                                value={sampleText}
                                onChange={(e) => setSampleText(e.target.value)}
                                placeholder="Paste a sample pitch or answer here..."
                                rows={8}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] font-medium focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none leading-relaxed placeholder:text-gray-300"
                            />
                            <div className="absolute top-4 right-4 flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">{sampleText.length} chars</span>
                                {sampleText && (
                                    <button
                                        onClick={() => setSampleText("")}
                                        className="p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-lg border border-gray-100 shadow-sm transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Score Button */}
                        <Button
                            onClick={scoreSample}
                            disabled={!sampleText.trim() || isScoring}
                            className="w-full h-14 bg-black text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl text-[16px] font-bold shadow-xl shadow-gray-100 flex items-center justify-center gap-3"
                        >
                            {isScoring ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    AI is evaluating...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5 fill-current" />
                                    Run AI Simulation
                                </>
                            )}
                        </Button>

                        {/* Results Display */}
                        <AnimatePresence mode="wait">
                            {scoringResults && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="space-y-6 pt-6 border-t border-gray-100 mt-4"
                                >
                                    {/* Overall Score Banner */}
                                    <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-gray-900 rounded-2xl text-white gap-8 overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                                        <div className="relative z-10 flex-1">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-[9px] font-black uppercase tracking-widest text-blue-300 mb-3">
                                                Simulation Result
                                            </div>
                                            <h3 className="text-xl font-black">AI Evaluation Complete</h3>
                                        </div>

                                        <div className="relative z-10 flex flex-col items-center justify-center min-w-[120px]">
                                            <div className="text-6xl font-black leading-none">{scoringResults.overallScore}</div>
                                            <div className="text-[10px] font-black uppercase tracking-[3px] text-gray-500 mt-1">Points</div>
                                        </div>
                                    </div>

                                    {/* Automation Recommendation Badge */}
                                    {(() => {
                                        const action = getThresholdAction(scoringResults.overallScore);
                                        const Icon = action.icon;
                                        return (
                                            <div className={cn(
                                                "flex items-center justify-between px-6 py-4 rounded-xl border",
                                                action.color === "green" ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                                                    action.color === "red" ? "bg-red-50 border-red-100 text-red-800" :
                                                        "bg-amber-50 border-amber-100 text-amber-800"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    <Icon className="w-5 h-5 font-bold" />
                                                    <span className="text-sm font-black uppercase tracking-widest">{action.label}</span>
                                                </div>
                                                <div className="text-xs font-bold opacity-60">Automated Route</div>
                                            </div>
                                        );
                                    })()}

                                    {/* Criterion Breakdown */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {criteria.map((criterion) => {
                                            const result = scoringResults.criterionScores[criterion.id];
                                            if (!result) return null;

                                            return (
                                                <motion.div
                                                    key={criterion.id}
                                                    whileHover={{ translateY: -2 }}
                                                    className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{criterion.name}</div>
                                                            <div className="text-2xl font-black text-gray-900">{result.score}<span className="text-sm text-gray-300 font-medium ml-0.5">/100</span></div>
                                                        </div>
                                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black text-xs text-gray-400">
                                                            {criterion.weight}%
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${result.score}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                            className={cn(
                                                                "h-full rounded-full",
                                                                result.score >= autoShortlistThreshold ? "bg-emerald-500" :
                                                                    result.score < autoRejectThreshold ? "bg-red-500" :
                                                                        "bg-amber-500"
                                                            )}
                                                        />
                                                    </div>

                                                    {/* AI Reasoning Container */}
                                                    <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 flex gap-3">
                                                        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                                        <p className="text-xs text-gray-600 font-medium leading-relaxed italic">
                                                            "{result.explanation}"
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-8 border-t border-gray-100 mt-8 mb-12">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        className="h-11 px-8 rounded-xl font-bold border-gray-200 hover:border-black transition-all order-2 sm:order-1"
                    >
                        Back
                    </Button>
                    <div className="flex items-center gap-4 w-full sm:w-auto order-1 sm:order-2">
                        <Button
                            onClick={onNext}
                            disabled={totalWeight !== 100}
                            className={cn(
                                "h-12 px-10 rounded-xl font-black text-base transition-all flex-1 sm:flex-initial flex items-center gap-3",
                                totalWeight === 100
                                    ? "bg-black text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gray-100"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                            )}
                        >
                            Continue to Settings
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>



            {/* Confirmation Modal */}
            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl shadow-2xl border-none">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">Replace current rubric?</DialogTitle>
                        <DialogDescription className="text-gray-600 mt-2">
                            This will remove all existing criteria and replace them with the <strong>{pendingTemplate?.title}</strong> template. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex sm:justify-end gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setIsConfirmModalOpen(false)}
                            className="px-6 h-11 border-gray-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => pendingTemplate && applyTemplate(pendingTemplate)}
                            className="px-6 h-11 bg-black text-white hover:bg-gray-800"
                        >
                            Replace
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Success Toast */}
            <AnimatePresence>
                {toast.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-full shadow-2xl flex items-center gap-3 border border-gray-800"
                    >
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-sm font-medium">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
