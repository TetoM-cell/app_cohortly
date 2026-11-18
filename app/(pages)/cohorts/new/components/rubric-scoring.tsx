"use client";

import React, { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Clock, ChevronDown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
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
    FlaskConicalIcon as AnimatedFlaskIcon,
    GlobeIcon as AnimatedGlobeIcon,
    GraduationCapIcon as AnimatedGraduationCapIcon,
    RocketIcon as AnimatedRocketIcon,
    SparklesIcon as AnimatedSparklesIcon,
    ZapIcon as AnimatedZapIcon,
} from "@animateicons/react/lucide";
import {
    RUBRIC_TEMPLATES,
    getSuggestedTemplateId,
    RubricTemplate as RubricTemplateType,
    CriterionTemplate
} from "../constants/rubric-templates";

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
    rocket: AnimatedRocketIcon,
    zap: AnimatedZapIcon,
    flask: AnimatedFlaskIcon,
    "graduation-cap": AnimatedGraduationCapIcon,
    globe: AnimatedGlobeIcon,
    sparkles: AnimatedSparklesIcon,
};

const getCriterionColor = (index: number) => `hsl(${220 + index * 35} 70% 50%)`;

type AnimatedIconHandle = {
    startAnimation: () => void;
    stopAnimation: () => void;
};

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
    const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
    const [criterionDraft, setCriterionDraft] = useState({ name: "", weight: 0, description: "" });

    // Template data
    const templates = Object.values(RUBRIC_TEMPLATES);
    const templateIconRefs = React.useRef<Record<string, AnimatedIconHandle | null>>({});

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

    const criterionChartData = [criteria.reduce<Record<string, number>>((data, criterion, index) => {
        data[`criterion-${index}`] = criterion.weight;
        return data;
    }, {})];

    const criterionChartConfig = criteria.reduce<ChartConfig>((config, criterion, index) => {
        config[`criterion-${index}`] = {
            label: criterion.name || `Criterion ${index + 1}`,
            color: getCriterionColor(index),
        };
        return config;
    }, {});

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
        if (editingCriterionId === id) setEditingCriterionId(null);
    };

    const openCriterionEditor = (criterion: Criterion) => {
        setEditingCriterionId(criterion.id);
        setCriterionDraft({
            name: criterion.name,
            weight: criterion.weight,
            description: criterion.description,
        });
    };

    const editingCriterion = criteria.find((criterion) => criterion.id === editingCriterionId);
    const remainingWeight = editingCriterion
        ? Math.max(0, 100 - criteria.reduce((sum, criterion) => (
            criterion.id === editingCriterion.id ? sum : sum + criterion.weight
        ), 0))
        : 0;

    const saveCriterionEdit = () => {
        if (!editingCriterion) return;

        const weight = Math.min(Math.max(0, criterionDraft.weight), remainingWeight);
        setCriteria(criteria.map((criterion) => criterion.id === editingCriterion.id
            ? { ...criterion, name: criterionDraft.name, weight, description: criterionDraft.description }
            : criterion
        ));
        setEditingCriterionId(null);
    };

    return (
        <div data-rubric-defaults className="min-h-screen bg-background">
            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-8 py-6 pb-24 space-y-6">
                <div>
                    <h1 className="font-playfair text-3xl font-semibold tracking-tight">
                        Evaluation Rubric
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Define how the AI should evaluate each application.
                    </p>
                </div>

                {/* Start with a proven rubric template */}
                <div className="space-y-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Start with a proven rubric template</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Choose a pre-built evaluation framework used by top programs — or start blank
                        </p>
                    </div>

                    <Carousel opts={{ align: "start", dragFree: true, duration: 12 }} className="w-full px-10">
                        <CarouselContent className="-ml-3">
                            {templates.map((template) => (
                                <CarouselItem key={template.id} className="basis-full pl-3 sm:basis-1/2 lg:basis-1/3">
                                    <div
                                        className="group relative flex h-full flex-col rounded-[1.25rem] border border-[var(--theme-primary)] bg-white p-4"
                                        onMouseEnter={() => templateIconRefs.current[template.id]?.startAnimation()}
                                    >
                                {template.tag && (
                                    <span className="absolute top-3 right-3 px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wider rounded-full border border-blue-100">
                                        {template.tag}
                                    </span>
                                )}

                                <div className="mb-3 flex h-10 w-10 items-center justify-center text-xl">
                                    {(() => {
                                        const Icon = TEMPLATE_ICONS[template.icon];
                                        return Icon ? (
                                            <Icon
                                                ref={(instance: AnimatedIconHandle | null) => {
                                                    templateIconRefs.current[template.id] = instance;
                                                }}
                                                size={24}
                                            />
                                        ) : null;
                                    })()}
                                </div>

                                <h3 className="text-base font-bold text-gray-900 mb-2">{template.title}</h3>

                                <ul className="space-y-1.5 mb-4 flex-1">
                                    {template.criteria.slice(0, 5).map((c, i) => (
                                        <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <span className="font-medium text-gray-800">{c.name}</span>
                                            <span className="text-gray-400">{c.weight}%</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    onClick={() => handleTemplateSelect(template)}
                                    variant="outline"
                                    className="w-full h-9 text-xs"
                                >
                                    Use this rubric
                                </Button>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-0 border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-background)]" />
                        <CarouselNext className="right-0 border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-background)]" />
                    </Carousel>
                </div>

                {/* Rubric Builder */}
                <Card
                    id="rubric-table"
                    className="scroll-mt-6 gap-4 py-4"
                >
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Criteria Builder</CardTitle>
                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        Presets
                                        <ChevronDown />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        Quick Templates
                                    </div>
                                    {templates.map((template) => (
                                        <DropdownMenuItem
                                            key={template.id}
                                            onClick={() => handleTemplateSelect(template)}
                                            className="cursor-pointer"
                                        >
                                            <span>{template.title}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                onClick={addCriterion}
                            >
                                <Plus />
                                New Criterion
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="grid min-w-0 gap-6 md:items-center md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)]">
                        <div className="flex min-h-[220px] items-center justify-center">
                            <ChartContainer config={criterionChartConfig} className="aspect-square w-full max-w-[220px]">
                                <RadialBarChart
                                    data={criterionChartData}
                                    innerRadius="58%"
                                    outerRadius="84%"
                                    startAngle={90}
                                    endAngle={-270}
                                    barSize={26}
                                >
                                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                                    {criteria.map((_, index) => (
                                        <RadialBar
                                            key={`criterion-${index}`}
                                            dataKey={`criterion-${index}`}
                                            stackId="criteria"
                                            fill={`var(--color-criterion-${index})`}
                                            cornerRadius={10}
                                            forceCornerRadius
                                            stroke="var(--theme-background)"
                                            strokeWidth={3}
                                            isAnimationActive
                                            animationBegin={index * 90}
                                            animationDuration={700}
                                            animationEasing="ease-out"
                                        />
                                    ))}
                                    <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle">
                                        <tspan x="50%" dy="-0.25em" className="fill-foreground text-3xl font-semibold">{criteria.length}</tspan>
                                        <tspan x="50%" dy="1.6em" className="fill-muted-foreground text-xs">criteria</tspan>
                                    </text>
                                </RadialBarChart>
                            </ChartContainer>
                        </div>

                        <div className="min-w-0 w-full max-w-[560px] self-center overflow-x-auto">
                        <table className="w-full min-w-[560px] table-fixed">
                            <thead className="bg-background border-b border-gray-100">
                                <tr>
                                    <th className="w-[28%] whitespace-normal px-2 py-1 text-left text-xs font-medium leading-tight text-muted-foreground">
                                        Criterion name
                                    </th>
                                    <th className="w-[17%] whitespace-normal px-2 py-1 text-left text-xs font-medium leading-tight text-muted-foreground">
                                        Weight/contribution
                                    </th>
                                    <th className="w-[39%] whitespace-normal px-2 py-1 text-left text-xs font-medium leading-tight text-muted-foreground">
                                        Instructions for AI
                                    </th>
                                    <th className="w-[16%]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                    {criteria.map((criterion, index) => (
                                        <tr key={criterion.id} className="group hover:bg-muted/50">
                                            <td className="max-w-0 px-2 py-1 text-xs font-medium">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span
                                                        className="size-2 shrink-0 rounded-full"
                                                        style={{ backgroundColor: getCriterionColor(index) }}
                                                    />
                                                    <span className="min-w-0 truncate">{criterion.name || "Untitled criterion"}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-1 text-xs tabular-nums whitespace-nowrap">
                                                {criterion.weight}%
                                            </td>
                                            <td className="max-w-0 px-2 py-1 text-xs text-muted-foreground">
                                                <div className="truncate">{criterion.description || "No instructions"}</div>
                                            </td>
                                            <td className="px-1 py-1 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="opacity-0 group-hover:opacity-100"
                                                    aria-label={`Edit ${criterion.name}`}
                                                    onClick={() => openCriterionEditor(criterion)}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="opacity-0 group-hover:opacity-100"
                                                    aria-label={`Delete ${criterion.name}`}
                                                    onClick={() => deleteCriterion(criterion.id)}
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </td>
                                        </tr>
                                ))}
                                {criteria.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-10 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="p-4 bg-gray-50 rounded-full mb-4">
                                                    <Plus className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <p className="font-medium">No criteria defined</p>
                                                <p className="text-sm text-muted-foreground">Pick a preset above or add a new criterion.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    </CardContent>

                    <CardFooter className="justify-end gap-2 py-0">
                        <Button variant="outline" onClick={() => setCriteria(criteria.map((criterion) => ({ ...criterion, weight: 0 })))}>
                            Reset
                        </Button>
                        <Button onClick={() => setToast({ message: "Criteria saved", visible: true })}>
                            Save
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Automation Settings</CardTitle>
                        <Switch
                            checked={smartThresholdsEnabled}
                            onCheckedChange={setSmartThresholdsEnabled}
                        />
                    </CardHeader>

                    <CardContent>
                    <AnimatePresence>
                        {smartThresholdsEnabled && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-6 overflow-hidden"
                            >
                                <div className="grid grid-cols-1 gap-8 pt-4 md:grid-cols-2">
                                    {/* Auto-Shortlist */}
                                    <div className="space-y-3 rounded-lg border border-[var(--color-green-200)] bg-[var(--color-green-50)] p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <UserPlus className="size-4 text-[var(--color-green-700)]" />
                                                <h3 className="text-sm font-medium text-[var(--color-green-800)]">Auto-Shortlist</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="whitespace-nowrap font-mono text-xs font-bold text-[var(--color-green-700)]">score ≥</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={autoShortlistThreshold}
                                                    className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const clamped = Math.min(100, Math.max(0, val));
                                                        setAutoShortlistThreshold(clamped);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs italic text-[var(--color-green-800)]">
                                            Any application that receives an overall score of {autoShortlistThreshold} or higher will be moved to "Shortlisted" automatically.
                                        </p>
                                    </div>

                                    {/* Auto-Reject */}
                                    <div className="space-y-3 rounded-lg border border-[var(--color-red-200)] bg-[var(--color-red-50)] p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="size-4 text-[var(--color-red-700)]" />
                                                <h3 className="text-sm font-medium text-[var(--color-red-800)]">Auto-Reject</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="whitespace-nowrap font-mono text-xs font-bold text-[var(--color-red-700)]">score &lt;</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={autoRejectThreshold}
                                                    className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const clamped = Math.min(100, Math.max(0, val));
                                                        setAutoRejectThreshold(clamped);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs italic text-[var(--color-red-800)]">
                                            Applications scoring below {autoRejectThreshold} will be automatically declined. They'll show up in your "Rejected" tab.
                                        </p>
                                    </div>

                                    {/* Manual Review Range Info */}
                                    <div className="flex items-center justify-between rounded-md border border-[var(--color-gray-200)] bg-[var(--color-gray-50)] p-3 md:col-span-2">
                                        <div className="flex items-center gap-3">
                                            <Clock className="size-4" />
                                            <span>Manual Review Window</span>
                                        </div>
                                        <span className="rounded-full border bg-background px-3 py-1 text-sm font-bold">
                                            {autoRejectThreshold} - {autoShortlistThreshold - 1} points
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
                </Card>

            </div>



            <Sheet
                open={editingCriterionId !== null}
                onOpenChange={(open) => {
                    if (!open) setEditingCriterionId(null);
                }}
            >
                <SheetContent side="right" showClose={false}>
                    <SheetHeader>
                        <SheetTitle className="font-playfair">Edit criterion</SheetTitle>
                        <SheetDescription>Update this criterion’s contribution and evaluation instructions.</SheetDescription>
                    </SheetHeader>

                    <div className="grid gap-4 px-4">
                        <div className="grid gap-2">
                            <Label htmlFor="criterion-name">Criterion name</Label>
                            <Input
                                id="criterion-name"
                                value={criterionDraft.name}
                                onChange={(event) => setCriterionDraft((draft) => ({ ...draft, name: event.target.value }))}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="criterion-weight">Weight/contribution</Label>
                            <Input
                                id="criterion-weight"
                                type="number"
                                min={0}
                                max={remainingWeight}
                                value={criterionDraft.weight}
                                onChange={(event) => setCriterionDraft((draft) => ({
                                    ...draft,
                                    weight: Math.min(remainingWeight, Math.max(0, Number(event.target.value) || 0)),
                                }))}
                            />
                            <p className="text-muted-foreground text-sm">Maximum available: {remainingWeight}%</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="criterion-instructions">Instructions for AI</Label>
                            <Textarea
                                id="criterion-instructions"
                                value={criterionDraft.description}
                                onChange={(event) => setCriterionDraft((draft) => ({ ...draft, description: event.target.value }))}
                                rows={5}
                            />
                        </div>
                    </div>

                    <SheetFooter>
                        <Button variant="outline" onClick={() => setEditingCriterionId(null)}>Cancel</Button>
                        <Button onClick={saveCriterionEdit}>Save changes</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Confirmation Modal */}
            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl border-none">
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
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-full flex items-center gap-3 border border-gray-800"
                    >
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-sm font-medium">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
