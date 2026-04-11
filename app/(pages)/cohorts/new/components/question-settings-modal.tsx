"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Plus, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Question, Section } from "./form-builder";

interface Condition {
    id: string;
    questionId: string;
    operator: string;
    value: string;
}

interface QuestionSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    question?: Question;
    sections?: Section[];
    initialTab?: string;
    onSave?: (updatedQuestion: Question) => void;
}

const OPERATORS = [
    { value: "is", label: "is" },
    { value: "is-not", label: "is not" },
    { value: "contains", label: "contains" },
    { value: "does-not-contain", label: "does not contain" },
    { value: "greater-than", label: "greater than" },
    { value: "less-than", label: "less than" },
];

export function QuestionSettingsModal({
    open,
    onOpenChange,
    question,
    sections = [],
    initialTab = "general",
    onSave
}: QuestionSettingsModalProps) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [questionText, setQuestionText] = useState("");
    const [description, setDescription] = useState("");
    const [required, setRequired] = useState(false);
    const [maxLength, setMaxLength] = useState("");
    const [maxFileSize, setMaxFileSize] = useState("10");
    const [conditions, setConditions] = useState<Condition[]>([]);
    const [logicOperator, setLogicOperator] = useState<"all" | "any">("all");
    const [options, setOptions] = useState<string[]>([]);

    const isChoiceType = question?.type && ["multiple-choice", "checkboxes", "dropdown"].includes(question.type);

    // Get list of questions that appear before the current one
    const previousQuestions = React.useMemo(() => {
        if (!question || !sections.length) return [];

        const allQuestions: { id: string, label: string }[] = [];
        let foundCurrent = false;

        for (const section of sections) {
            for (const q of section.questions) {
                if (q.id === question.id) {
                    foundCurrent = true;
                    break;
                }
                allQuestions.push({
                    id: q.id,
                    label: q.text || `Question ${allQuestions.length + 1}`
                });
            }
            if (foundCurrent) break;
        }
        return allQuestions;
    }, [sections, question]);

    // Helper to get options for a question by its ID
    const getTargetQuestionOptions = (targetId: string) => {
        for (const section of sections) {
            const found = section.questions.find(q => q.id === targetId);
            if (found && found.options) return found.options;
        }
        return null;
    };

    // Sync state when question changes
    React.useEffect(() => {
        if (question) {
            setQuestionText(question.text || "");
            setDescription(question.description || "");
            setRequired(question.required || false);
            setMaxLength(question.maxLength || "");
            setMaxFileSize(question.maxFileSize || "10");
            setConditions(
                (question.conditions || []).map((c, i) => ({
                    ...c,
                    id: `c-${i}-${Date.now()}`
                }))
            );
            setLogicOperator(question.logicOperator || "all");
            setOptions(question.options || []);
        }
        if (open) {
            setActiveTab(initialTab);
        }
    }, [question, open, initialTab]);

    const handleSave = () => {
        if (!question || !onSave) {
            onOpenChange(false);
            return;
        }

        const logicSummary = conditions.length > 0
            ? `Shown if ${logicOperator === 'all' ? 'ALL' : 'ANY'} conditions met: ${conditions.map(c => {
                const targetQ = previousQuestions.find(pq => pq.id === c.questionId);
                return `${targetQ ? targetQ.label : 'Question'} ${c.operator.replace('-', ' ')} "${c.value}"`;
            }).join(', ')}`
            : undefined;

        const updatedQuestion: Question = {
            ...question,
            text: questionText,
            description,
            required,
            maxLength,
            maxFileSize,
            conditions: conditions.map(({ id, ...rest }) => rest),
            logicOperator,
            options: isChoiceType ? options : undefined,
            hasLogic: conditions.length > 0,
            logicSummary
        };

        onSave(updatedQuestion);
        onOpenChange(false);
    };

    const addCondition = () => {
        setConditions([
            ...conditions,
            {
                id: `condition-${Date.now()}`,
                questionId: "",
                operator: "is",
                value: "",
            },
        ]);
    };

    const removeCondition = (id: string) => {
        setConditions(conditions.filter((c) => c.id !== id));
    };

    const updateCondition = (id: string, field: keyof Condition, value: string) => {
        setConditions(
            conditions.map((c) => (c.id === id ? { ...c, [field]: value } : c))
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[600px] w-full max-h-[90vh] bg-white border-0 shadow-2xl rounded-2xl overflow-hidden"
                wrapperClassName="flex flex-col p-0 h-full max-h-[90vh] overflow-hidden"
            >
                <div className="p-6 flex-shrink-0 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                             <DialogTitle className="text-xl font-bold text-gray-900">Component Settings</DialogTitle>
                            <p className="text-sm text-gray-500 mt-1 font-medium">Configure properties for this field.</p>
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="px-6 py-4 flex-shrink-0 border-b border-gray-100">
                        <TabsList className="w-full h-12 p-1 bg-gray-50/80 rounded-xl gap-1">
                            <TabsTrigger
                                value="general"
                                className="flex-1 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm rounded-lg transition-all h-full"
                            >
                                General
                            </TabsTrigger>
                            {isChoiceType && (
                                <TabsTrigger
                                    value="options"
                                    className="flex-1 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm rounded-lg transition-all h-full"
                                >
                                    Options
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                value="validation"
                                className="flex-1 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm rounded-lg transition-all h-full"
                            >
                                Validation
                            </TabsTrigger>
                            <TabsTrigger
                                value="logic"
                                className="flex-1 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm rounded-lg transition-all h-full"
                            >
                                Logic
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 px-6 py-4 bg-white" style={{ maxHeight: 'calc(90vh - 250px)' }}>
                        {/* General Tab */}
                        <TabsContent value="general" className="space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none pb-4">
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Label
                                </label>
                                <Input
                                    value={questionText}
                                    onChange={(e) => setQuestionText(e.target.value)}
                                    placeholder="Enter question text..."
                                    className="h-11 font-bold text-gray-900 bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 focus:ring-0 rounded-xl transition-all placeholder:text-gray-400"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Description
                                </label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add helpful context or instructions..."
                                    className="min-h-[100px] font-medium text-gray-900 bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 focus:ring-0 rounded-xl transition-all resize-none placeholder:text-gray-400 leading-relaxed"
                                />
                                <p className="text-[11px] text-gray-400 font-medium">
                                    This text appears below the question label.
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-transparent hover:border-gray-100 transition-colors">
                                <div>
                                    <div className="text-sm font-bold text-gray-900">Required Field</div>
                                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                        Applicants cannot submit without answering
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={required}
                                        onChange={(e) => setRequired(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black transition-colors duration-200"></div>
                                </label>
                            </div>
                        </TabsContent>

                        {/* Options Tab */}
                        {isChoiceType && (
                            <TabsContent value="options" className="space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">Choices</h3>
                                            <p className="text-xs text-gray-500 font-medium">Configure available options</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setOptions([...options, `Option ${options.length + 1}`])}
                                            className="h-8 rounded-lg text-xs font-bold uppercase tracking-wide border-gray-200 hover:bg-gray-50 hover:text-black transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                                            Add Option
                                        </Button>
                                    </div>

                                    <div className="space-y-2.5">
                                        {options.map((option, index) => (
                                            <div key={index} className="flex items-center gap-3 group">
                                                <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-black group-hover:text-white transition-colors duration-200">
                                                    {index + 1}
                                                </div>
                                                <Input
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...options];
                                                        newOptions[index] = e.target.value;
                                                        setOptions(newOptions);
                                                    }}
                                                    className="h-10 bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 focus:ring-0 rounded-xl transition-all flex-1 text-sm font-medium"
                                                />
                                                <button
                                                    onClick={() => setOptions(options.filter((_, i) => i !== index))}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {options.length === 0 && (
                                            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/30">
                                                <p className="text-sm font-medium text-gray-400">No options defined yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        )}

                        {/* Validation Tab */}
                        <TabsContent value="validation" className="space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Character Limit
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={maxLength}
                                    onChange={(e) => setMaxLength(e.target.value)}
                                    placeholder="e.g., 500"
                                    className="h-11 font-medium bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 focus:ring-0 rounded-xl transition-all"
                                />
                                <p className="text-[11px] text-gray-400 font-medium">
                                    Maximum characters allowed for the answer.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Max File Size (MB)
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={maxFileSize}
                                    onChange={(e) => setMaxFileSize(e.target.value)}
                                    placeholder="e.g., 10"
                                    className="h-11 font-medium bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 focus:ring-0 rounded-xl transition-all"
                                />
                                <p className="text-[11px] text-gray-400 font-medium">
                                    Maximum size per uploaded file.
                                </p>
                            </div>

                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <p className="text-xs text-blue-900 font-medium leading-relaxed">
                                    <span className="font-bold">Pro Tip:</span> Additional validation rules (like email format validation) are automatically applied based on the question type.
                                </p>
                            </div>
                        </TabsContent>

                        {/* Logic Tab */}
                        <TabsContent value="logic" className="space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">
                                        Display Logic
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Conditionally show this question based on previous answers.
                                    </p>
                                </div>

                                {conditions.length > 0 && (
                                    <>
                                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Show if</span>
                                            <Select value={logicOperator} onValueChange={(val) => setLogicOperator(val as "all" | "any")}>
                                                <SelectTrigger className="w-24 h-8 text-xs font-bold bg-white border-transparent shadow-sm rounded-lg focus:ring-0">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">ALL</SelectItem>
                                                    <SelectItem value="any">ANY</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <span className="text-xs font-medium text-gray-500">conditions match:</span>
                                        </div>

                                        <div className="space-y-3">
                                            {conditions.map((condition, index) => (
                                                <div
                                                    key={condition.id}
                                                    className="p-3 border border-gray-100 rounded-xl bg-white space-y-2 shadow-sm"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-1 flex gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <Select
                                                                    value={condition.questionId}
                                                                    onValueChange={(val) => updateCondition(condition.id, "questionId", val)}
                                                                >
                                                                    <SelectTrigger className="h-10 text-xs w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 rounded-lg font-medium">
                                                                        <SelectValue placeholder="Select question" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {previousQuestions.map((q) => (
                                                                            <SelectItem key={q.id} value={q.id}>
                                                                                {q.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <Select
                                                                    value={condition.operator}
                                                                    onValueChange={(val) => updateCondition(condition.id, "operator", val)}
                                                                >
                                                                    <SelectTrigger className="h-10 text-xs w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 rounded-lg font-medium">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {OPERATORS.map((op) => (
                                                                            <SelectItem key={op.value} value={op.value}>
                                                                                {op.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => removeCondition(condition.id)}
                                                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors flex-shrink-0"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {(() => {
                                                        const targetOptions = getTargetQuestionOptions(condition.questionId);
                                                        if (targetOptions && targetOptions.length > 0) {
                                                            return (
                                                                <Select
                                                                    value={condition.value}
                                                                    onValueChange={(val) => updateCondition(condition.id, "value", val)}
                                                                >
                                                                    <SelectTrigger className="h-10 text-xs w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 rounded-lg font-medium">
                                                                        <SelectValue placeholder="Select option" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {targetOptions.map((opt, i) => (
                                                                            <SelectItem key={i} value={opt}>
                                                                                {opt}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            );
                                                        }
                                                        return (
                                                            <Input
                                                                value={condition.value}
                                                                onChange={(e) => updateCondition(condition.id, "value", e.target.value)}
                                                                placeholder="Type a value..."
                                                                className="h-10 bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 rounded-lg text-xs font-medium w-full transition-all"
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <Button
                                    onClick={addCondition}
                                    variant="outline"
                                    className="w-full h-10 border-dashed border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500"
                                    disabled={previousQuestions.length === 0}
                                >
                                    <Plus className="w-3.5 h-3.5 mr-2" />
                                    Add Logic Rule
                                </Button>
                                {previousQuestions.length === 0 && (
                                    <p className="text-[10px] text-gray-400 text-center italic mt-2 font-medium">
                                        Add questions above this one to enable conditional logic.
                                    </p>
                                )}
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white flex-shrink-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-black">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-black hover:bg-gray-800 text-white rounded-xl px-6 py-2 h-10 text-sm font-bold shadow-lg shadow-gray-200">
                        Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog >
    );
}
