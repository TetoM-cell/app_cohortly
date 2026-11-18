"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
    Plus, GripVertical, Trash2, Settings, ChevronDown, ChevronUp, Play,
    Copy, MoreVertical, Type, Upload, Image as ImageIcon, X, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { QuestionSettingsModal } from "./question-settings-modal";
import { Question, Section, getIconForType } from "./form-builder";
import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QuestionPreview } from "./question-preview";

// Local interfaces removed as they are now imported from form-builder

interface FormCanvasProps {
    className?: string;
    sections: Section[];
    setSections: React.Dispatch<React.SetStateAction<Section[]>>;
    showCoverPage: boolean;
    showThankYouPage: boolean;
    setShowThankYouPage: (show: boolean) => void;
    activeId?: string | null;
    coverImage: string | null;
    setCoverImage: (url: string | null) => void;
    logo: string | null;
    setLogo: (url: string | null) => void;
    cohortData: any;
    setCohortData: React.Dispatch<React.SetStateAction<any>>;
    onPreview: () => void;
}

function SortableQuestion({
    question,
    sectionId,
    onToggleRequired,
    onDelete,
    onDuplicate,
    onOpenSettings,
    onUpdateText,
}: {
    question: Question;
    sectionId: string;
    onToggleRequired: (s: string, q: string) => void;
    onDelete: (s: string, q: string) => void;
    onDuplicate: (s: string, q: string) => void;
    onOpenSettings: (q: Question, tab: string) => void;
    onUpdateText: (sectionId: string, questionId: string, text: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const Icon = question.icon;
    const effectiveHasLogic = question.hasLogic || (question.conditions && question.conditions.length > 0);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group p-5 border rounded-2xl relative transition-all duration-200",
                effectiveHasLogic
                    ? "border-[var(--wizard-active-border)] bg-white"
                    : "border-gray-100 bg-white hover:border-gray-300",
                isDragging && "opacity-90 border-blue-500 z-20"
            )}
        >
            {effectiveHasLogic && (
                <div className="absolute bottom-3 right-3 z-10">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" aria-label="Logic is active." className="size-2 rounded-full bg-[var(--wizard-active-border)] transition-transform hover:scale-125">
                                    <span className="sr-only">Logic is active.</span>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Logic is active.</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}

            <div className="flex items-start gap-4 relative">
                <div {...listeners} {...attributes} className="mt-1 cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors group/grip">
                    <GripVertical className="w-4 h-4 text-gray-300 group-hover/grip:text-black transition-colors" />
                </div>
                <div className={cn(
                    "p-2.5 rounded-xl transition-colors",
                    effectiveHasLogic ? "bg-blue-100 text-blue-600" : "bg-gray-50 text-gray-500 group-hover:bg-black group-hover:text-white"
                )}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 pr-12 pt-0.5">
                    <div className="flex items-start gap-1.5 group/q-edit">
                        <textarea
                            value={question.text}
                            onChange={(e) => {
                                onUpdateText(sectionId, question.id, e.target.value);
                            }}
                            rows={1}
                            className="w-auto max-w-full flex-none font-bold text-[15px] bg-transparent border-none p-0 outline-none text-gray-900 placeholder:text-gray-300 resize-none overflow-hidden leading-relaxed [field-sizing:content]"
                            placeholder="Enter question text..."
                            onFocus={(e) => {
                            }}
                        />
                        <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover/q-edit:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </div>
                    {question.description && (
                        <p className="text-xs text-gray-400 mt-1 font-medium">{question.description}</p>
                    )}

                    <div className="mt-3">
                        <QuestionPreview question={question} />
                    </div>
                </div>

                <div className="absolute top-0 right-0 h-10 flex items-start opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto transform translate-x-2 group-hover:translate-x-0">
                    <div className="flex items-center gap-1 pl-4">
                        <button
                            onClick={() => onOpenSettings(question, "general")}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900"
                            title="Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900"
                                    title="More options"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl border-gray-100">
                                <DropdownMenuItem onClick={() => onDuplicate(sectionId, question.id)} className="rounded-lg text-xs font-medium py-2">
                                    <Copy className="w-3.5 h-3.5 mr-2" />
                                    Duplicate
                                </DropdownMenuItem>
                                <div className="h-px bg-gray-50 my-1" />
                                <DropdownMenuItem
                                    onClick={() => onDelete(sectionId, question.id)}
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50 rounded-lg text-xs font-medium py-2"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Delete Question
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DroppableSection({
    section,
    sectionIndex,
    children,
    onToggleSection,
    onDeleteSection,
    onUpdateTitle,
    onUpdateDescription,
    isOverAny,
}: {
    section: Section;
    sectionIndex: number;
    children: React.ReactNode;
    onToggleSection: (id: string) => void;
    onDeleteSection: (id: string) => void;
    onUpdateTitle: (id: string, title: string) => void;
    onUpdateDescription: (id: string, desc: string) => void;
    isOverAny: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isOver,
        isDragging
    } = useSortable({
        id: section.id,
        data: {
            isSection: true,
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group bg-white rounded-2xl border border-border transition-all duration-200",
                isOver ? "border-blue-400 bg-blue-50/10 ring-2 ring-blue-500/10 scale-[1.01]" : "hover:border-foreground",
                isOverAny && !isOver && "border-dashed border-gray-200 opacity-60",
                isDragging && "opacity-80 border-blue-500 z-20"
            )}
        >
            <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 group/header">
                        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover/header:opacity-100">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex max-w-full items-center gap-1.5 group/title-edit">
                                <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => onUpdateTitle(section.id, e.target.value)}
                                    className="w-auto max-w-full flex-none text-lg font-bold text-gray-900 bg-transparent border-none p-0 outline-none placeholder:text-gray-300 transition-colors focus:text-black [field-sizing:content]"
                                    placeholder="Section Title"
                                />
                                <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover/title-edit:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                            <div className="flex max-w-full items-center gap-1.5 group/desc-edit">
                                <input
                                    type="text"
                                    value={section.description}
                                    onChange={(e) => onUpdateDescription(section.id, e.target.value)}
                                    placeholder="Add a description for this section..."
                                    className="w-auto max-w-full flex-none text-sm text-gray-500 bg-transparent border-none p-0 outline-none placeholder:text-gray-300 font-medium [field-sizing:content]"
                                />
                                <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover/desc-edit:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onToggleSection(section.id)}
                            className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-400 hover:text-black"
                        >
                            {section.isCollapsed ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronUp className="w-4 h-4" />
                            )}
                        </button>
                        <button
                            onClick={() => onDeleteSection(section.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {!section.isCollapsed && <div className="px-6 pb-6 space-y-4">{children}</div>}
        </div>
    );
}

export function FormCanvas({
    className,
    sections,
    setSections,
    showCoverPage,
    showThankYouPage,
    setShowThankYouPage,
    activeId,
    coverImage,
    setCoverImage,
    logo,
    setLogo,
    cohortData,
    setCohortData,
    onPreview
}: FormCanvasProps) {
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | undefined>(undefined);
    const [initialTab, setInitialTab] = useState("general");

    const coverInputRef = React.useRef<HTMLInputElement>(null);
    const logoInputRef = React.useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'logo') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'cover') setCoverImage(reader.result as string);
                else setLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleSection = (sectionId: string) => {
        setSections(sections.map(s =>
            s.id === sectionId ? { ...s, isCollapsed: !s.isCollapsed } : s
        ));
    };

    const toggleRequired = (sectionId: string, questionId: string) => {
        setSections(sections.map(s =>
            s.id === sectionId
                ? {
                    ...s,
                    questions: s.questions.map(q =>
                        q.id === questionId ? { ...q, required: !q.required } : q
                    )
                }
                : s
        ));
    };

    const deleteQuestion = (sectionId: string, questionId: string) => {
        setSections(sections.map(s =>
            s.id === sectionId
                ? { ...s, questions: s.questions.filter(q => q.id !== questionId) }
                : s
        ));
    };

    const duplicateQuestion = (sectionId: string, questionId: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                const questionIndex = s.questions.findIndex(q => q.id === questionId);
                const questionToDuplicate = s.questions[questionIndex];
                const newQuestion = {
                    ...questionToDuplicate,
                    id: `${questionToDuplicate.id}-copy-${Date.now()}`
                };
                const newQuestions = [...s.questions];
                newQuestions.splice(questionIndex + 1, 0, newQuestion);
                return { ...s, questions: newQuestions };
            }
            return s;
        }));
    };

    const deleteSection = (sectionId: string) => {
        setSections(sections.filter(s => s.id !== sectionId));
    };

    return (
        <div className={cn("h-full overflow-y-auto px-4 pb-20", className)}>
            <div className="max-w-4xl mx-auto pt-8 pb-12 space-y-8">
                {/* Header / Canvas Toolbar */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-playfair text-3xl font-semibold tracking-tight">Application Form</h1>
                        <p className="mt-1 text-sm text-muted-foreground font-sans">Design the intake form for your cohort.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" variant="outline" size="icon-lg" onClick={onPreview} aria-label="Preview">
                                        <Play className="size-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Preview</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <Button
                            onClick={() => {
                                const newSection: Section = {
                                    id: `section-${Date.now()}`,
                                    title: "Untitled Section",
                                    description: "This is a description for your section.",
                                    questions: [],
                                    isCollapsed: false,
                                };
                                setSections([...sections, newSection]);
                            }}
                            className=""
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Add Section
                        </Button>
                    </div>
                </div>

                {/* Cover Page */}
                {showCoverPage && (
                    <div className="bg-white rounded-2xl border border-border hover:border-foreground transition-all overflow-hidden group">
                        {/* Cover Image Preview */}
                        {coverImage && (
                            <div className="relative h-56 w-full group/image">
                                <img src={coverImage} alt="Cover" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => coverInputRef.current?.click()}
                                        className="px-4 py-2 bg-white/90 backdrop-blur rounded-xl text-xs font-bold hover:bg-white transition-colors flex items-center gap-2"
                                    >
                                        <Upload className="w-3.5 h-3.5" /> Change Cover
                                    </button>
                                    <button
                                        onClick={() => setCoverImage(null)}
                                        className="p-2 bg-white/90 backdrop-blur rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="p-8">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    {/* Logo Upload/Preview */}
                                    {logo ? (
                                        <div className="relative group/logo w-20 h-20 rounded-2xl overflow-hidden border border-gray-100 bg-white">
                                            <img src={logo} alt="Logo" className="w-full h-full object-contain p-2" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={() => setLogo(null)}
                                                    className="p-1.5 bg-white rounded-full text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => logoInputRef.current?.click()}
                                            className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-gray-300 hover:bg-gray-50 transition-all group/btn"
                                        >
                                            <ImageIcon className="w-5 h-5 text-gray-400 group-hover/btn:text-gray-600" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Logo</span>
                                        </button>
                                    )}
                                    <div className="hidden">
                                        {/* Hidden inputs */}
                                        <input
                                            type="file"
                                            ref={coverInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'cover')}
                                        />
                                        <input
                                            type="file"
                                            ref={logoInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'logo')}
                                        />
                                    </div>

                                    {!coverImage && (
                                        <button
                                            onClick={() => coverInputRef.current?.click()}
                                            className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            Add Cover Image
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-4 max-w-2xl">
                                <div className="flex max-w-full items-center gap-2 group/cover-title-edit">
                                    <input
                                        type="text"
                                        placeholder="Application Title"
                                        className="w-auto max-w-full flex-none text-4xl font-black bg-transparent border-none p-0 placeholder:text-gray-200 outline-none focus:ring-0 text-gray-900 tracking-tight [field-sizing:content]"
                                        value={cohortData.name}
                                        onChange={(e) => setCohortData({ ...cohortData, name: e.target.value })}
                                    />
                                    <Pencil className="w-4 h-4 text-gray-300 opacity-0 group-hover/cover-title-edit:opacity-100 transition-opacity flex-shrink-0" />
                                </div>
                                <div className="flex max-w-full items-start gap-2 text-lg group/cover-desc-edit">
                                    <textarea
                                        placeholder="Add a description or welcome message..."
                                        className="w-auto max-w-full min-h-[80px] flex-none bg-transparent border-none p-0 placeholder:text-gray-300 outline-none resize-none leading-relaxed text-gray-600 font-medium [field-sizing:content]"
                                        value={cohortData.description}
                                        onChange={(e) => setCohortData({ ...cohortData, description: e.target.value })}
                                    />
                                    <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover/cover-desc-edit:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                                </div>
                                {cohortData.collectName && (
                                    <p className="text-xs italic text-[var(--wizard-active-text)]">
                                        * Applicant name will be collected
                                    </p>
                                )}
                            </div>
                            
                        </div>
                    </div>
                )}

                {/* Sections */}
                <SortableContext
                    items={sections.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-8">
                        {sections.map((section, sectionIndex) => (
                            <DroppableSection
                                key={section.id}
                                section={section}
                                sectionIndex={sectionIndex}
                                onToggleSection={toggleSection}
                                onDeleteSection={deleteSection}
                                onUpdateTitle={(id, title) => {
                                    setSections(sections.map(s => s.id === id ? { ...s, title } : s));
                                }}
                                onUpdateDescription={(id, description) => {
                                    setSections(sections.map(s => s.id === id ? { ...s, description } : s));
                                }}
                                isOverAny={!!activeId}
                            >
                                <SortableContext
                                    items={section.questions.map(q => q.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-4">
                                        {section.questions.map((question) => (
                                            <SortableQuestion
                                                key={question.id}
                                                question={question}
                                                sectionId={section.id}
                                                onToggleRequired={toggleRequired}
                                                onDelete={deleteQuestion}
                                                onDuplicate={duplicateQuestion}
                                                onOpenSettings={(q, tab) => {
                                                    setSelectedQuestion(q);
                                                    setInitialTab(tab);
                                                    setSettingsModalOpen(true);
                                                }}
                                                onUpdateText={(sId, qId, newText) => {
                                                    setSections(prev => prev.map(s =>
                                                        s.id === sId
                                                            ? {
                                                                ...s,
                                                                questions: s.questions.map(q =>
                                                                    q.id === qId ? { ...q, text: newText } : q
                                                                )
                                                            }
                                                            : s
                                                    ));
                                                }}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>

                                {/* Drop Placeholder if section is empty and being hovered */}
                                {section.questions.length === 0 && (
                                    <div className="w-full py-8 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/30 transition-colors hover:bg-gray-50">
                                        <div className="p-3 bg-white rounded-full mb-2">
                                            <Plus className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Drop questions here</p>
                                    </div>
                                )}

                            </DroppableSection>
                        ))}
                    </div>
                </SortableContext>

                {/* Bottom - Add Section Big Button */}
                <button
                    className="w-full h-16 border-2 border-dashed border-gray-200 rounded-2xl hover:border-gray-400 hover:bg-gray-50 text-gray-400 hover:text-black font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 group"
                    onClick={() => {
                        const newSection: Section = {
                            id: `section-${Date.now()}`,
                            title: "Untitled Section",
                            description: "This is a description for your section.",
                            questions: [],
                            isCollapsed: false,
                        };
                        setSections([...sections, newSection]);
                    }}
                >
                    <div className="p-1 bg-gray-200 rounded text-white group-hover:bg-black transition-colors">
                        <Plus className="w-4 h-4" />
                    </div>
                    Create New Section
                </button>

                {/* Thank You Page */}
                {showThankYouPage && (
                    <div className="bg-white rounded-2xl border border-border hover:border-foreground p-8 transition-all group mt-8">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gray-900 rounded-xl text-white">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Thank You Page</h3>
                                    <p className="text-xs text-gray-500 font-medium">Shown after submission</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowThankYouPage(false)}
                                className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                            >
                                <Trash2 className="w-4.5 h-4.5" />
                            </button>
                        </div>
                        <div className="space-y-4 ml-14">
                            <div className="flex max-w-full items-center gap-2 group/ty-title-edit">
                                <input
                                    type="text"
                                    placeholder="Thank you message"
                                    className="w-auto max-w-full flex-none text-2xl font-bold bg-transparent border-none p-0 placeholder:text-gray-200 outline-none focus:ring-0 text-gray-900 [field-sizing:content]"
                                    defaultValue="Thank you for applying!"
                                />
                                <Pencil className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover/ty-title-edit:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                            <div className="flex max-w-full items-start gap-2 group/ty-msg-edit">
                                <textarea
                                    placeholder="Add a closing message..."
                                    className="w-auto max-w-full min-h-[60px] flex-none bg-transparent border-none p-0 placeholder:text-gray-300 outline-none resize-none text-sm font-medium leading-relaxed text-gray-600 [field-sizing:content]"
                                    defaultValue="We'll review your application and get back to you soon."
                                />
                                <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover/ty-msg-edit:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                            </div>
                        </div>
                    </div>
                )}

            </div>

            <QuestionSettingsModal
                open={settingsModalOpen}
                onOpenChange={setSettingsModalOpen}
                question={selectedQuestion || undefined}
                sections={sections}
                initialTab={initialTab}
                onSave={(updatedQuestion) => {
                    setSections(prev => prev.map(s => ({
                        ...s,
                        questions: s.questions.map(q =>
                            q.id === updatedQuestion.id ? updatedQuestion : q
                        )
                    })));
                }}
            />
        </div>
    );
}
