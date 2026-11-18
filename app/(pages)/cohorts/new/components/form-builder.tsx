"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
    Plus, ExpandIcon, Info,
    Type, AlignLeft, Mail, Phone, Calendar, Upload, Video,
    Image as ImageIcon, ListChecks, ChevronDown as ChevronDownIcon,
    DollarSign, TrendingUp, MapPin, Users, UserPlus, Link as LinkIcon,
    FileText
} from "lucide-react";
import { QuestionLibrary } from "./question-library";
import { FormCanvas } from "./form-canvas";
import { FormPreview } from "./form-preview";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

export interface Question {
    id: string;
    type: string;
    icon: any;
    text: string;
    required: boolean;
    hasLogic?: boolean;
    logicSummary?: string;
    conditions?: Array<{
        questionId: string;
        operator: string;
        value: string;
    }>;
    logicOperator?: "any" | "all";
    description?: string;
    maxLength?: string;
    maxFileSize?: string;
    options?: string[];
}

export interface Section {
    id: string;
    title: string;
    description: string;
    questions: Question[];
    isCollapsed: boolean;
}

export const getIconForType = (type: string): any => {
    const iconMap: Record<string, React.ElementType> = {
        'short-text': Type,
        'long-text': AlignLeft,
        'email': Mail,
        'phone': Phone,
        'date': Calendar,
        'file-upload': Upload,
        'video-pitch': Video,
        'image-upload': ImageIcon,
        'multiple-choice': ListChecks,
        'checkboxes': ListChecks,
        'dropdown': ChevronDownIcon,
        'funding-raised': DollarSign,
        'revenue': TrendingUp,
        'traction': TrendingUp,
        'location': MapPin,
        'diversity': Users,
        'team-invites': UserPlus,
        'references': LinkIcon,
        'statement': FileText,
    };
    return iconMap[type] || Type;
};

interface FormBuilderProps {
    onNext: () => void;
    onBack: () => void;
    onSave?: () => Promise<void>;
    steps?: { title: string; id: number }[];
    currentStep?: number;
    sections: Section[];
    setSections: React.Dispatch<React.SetStateAction<Section[]>>;
    coverImage: string | null;
    setCoverImage: (url: string | null) => void;
    logo: string | null;
    setLogo: (url: string | null) => void;
    cohortData: any;
    setCohortData: React.Dispatch<React.SetStateAction<any>>;
}

export function FormBuilder({
    sections,
    setSections,
    coverImage,
    setCoverImage,
    logo,
    setLogo,
    cohortData,
    setCohortData
}: FormBuilderProps) {
    const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
    const [showCoverPage, setShowCoverPage] = useState(true);
    const [showThankYouPage, setShowThankYouPage] = useState(false);
    const [mobileView, setMobileView] = useState<"library" | "canvas">("canvas");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Configure drag sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required to start drag
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();

        // Handle dragging a library item over a section
        if (activeId.startsWith("library-")) {
            return; // handleDragEnd will take care of this
        }

        // Find the sections for both active and over items
        const activeSection = sections.find(s => s.questions.some(q => q.id === activeId));
        const overSection = sections.find(s => s.id === overId || s.questions.some(q => q.id === overId));

        if (!activeSection || !overSection || activeSection === overSection) return;

        // Moving question between sections
        setSections(prev => {
            const activeSectionIndex = prev.findIndex(s => s.id === activeSection.id);
            const overSectionIndex = prev.findIndex(s => s.id === overSection.id);
            const questionIndex = prev[activeSectionIndex].questions.findIndex(q => q.id === activeId);
            const question = prev[activeSectionIndex].questions[questionIndex];

            const newSections = [...prev];
            // Remove from old section
            newSections[activeSectionIndex] = {
                ...newSections[activeSectionIndex],
                questions: newSections[activeSectionIndex].questions.filter(q => q.id !== activeId),
            };
            // Add to new section
            const overQuestionIndex = overSection.questions.findIndex(q => q.id === overId);
            const newIndex = overQuestionIndex === -1 ? overSection.questions.length : overQuestionIndex;

            newSections[overSectionIndex] = {
                ...newSections[overSectionIndex],
                questions: [
                    ...newSections[overSectionIndex].questions.slice(0, newIndex),
                    question,
                    ...newSections[overSectionIndex].questions.slice(newIndex),
                ],
            };
            return newSections;
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();

        // Handle dropping from library to canvas
        if (activeId.startsWith("library-")) {
            if (overId === "question-library-drop-zone" || overId.startsWith("library-")) return;
            const questionType = activeId.replace("library-", "");
            const targetSectionId = overId;

            // Find the section (either direct hit or hit on a question within)
            let sectionIndex = sections.findIndex(s => s.id === targetSectionId);
            if (sectionIndex === -1) {
                sectionIndex = sections.findIndex(s => s.questions.some(q => q.id === targetSectionId));
            }

            if (sectionIndex === -1) return;

            // Create new question
            const newQuestion: Question = {
                id: `q-${Date.now()}`,
                type: questionType,
                icon: getIconForType(questionType),
                text: "", // Start with empty text to encourage editing
                required: false,
                hasLogic: false,
                conditions: [],
                logicOperator: "any",
                options: ["multiple-choice", "checkboxes", "dropdown"].includes(questionType)
                    ? ["Option 1", "Option 2", "Option 3"]
                    : undefined
            };

            // Add question to section
            setSections(prev => {
                const newSections = [...prev];
                const targetSection = newSections[sectionIndex];
                const overQuestionIndex = targetSection.questions.findIndex(q => q.id === overId);
                const newIndex = overQuestionIndex === -1 ? targetSection.questions.length : overQuestionIndex;

                newSections[sectionIndex] = {
                    ...targetSection,
                    questions: [
                        ...targetSection.questions.slice(0, newIndex),
                        newQuestion,
                        ...targetSection.questions.slice(newIndex),
                    ],
                };
                return newSections;
            });
            return;
        }

        // Handle reordering within or across sections
        const activeSection = sections.find(s => s.questions.some(q => q.id === activeId));
        const overSection = sections.find(s => s.id === overId || s.questions.some(q => q.id === overId));

        if (!activeSection || !overSection) return;

        if (activeSection === overSection) {
            // Reordering within the same section
            const sectionIndex = sections.findIndex(s => s.id === activeSection.id);
            const oldIndex = activeSection.questions.findIndex(q => q.id === activeId);
            const newIndex = activeSection.questions.findIndex(q => q.id === overId);

            if (oldIndex !== newIndex) {
                setSections(prev => {
                    const newSections = [...prev];
                    newSections[sectionIndex] = {
                        ...newSections[sectionIndex],
                        questions: arrayMove(newSections[sectionIndex].questions, oldIndex, newIndex),
                    };
                    return newSections;
                });
            }
        }

        // Handle section reordering
        if (active.data.current?.isSection && over.id !== active.id) {
            setSections((prev) => {
                const oldIndex = prev.findIndex((s) => s.id === active.id);
                const newIndex = prev.findIndex((s) => s.id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
        >
            <div data-form-builder-defaults className="w-full h-screen flex flex-col">
                {/* Mobile View Switcher */}
                <div className="lg:hidden flex items-center justify-center gap-2 p-3">
                    <button
                        onClick={() => setMobileView("library")}
                        className={cn(
                            "flex-1 py-2 px-4",
                            mobileView === "library"
                                ? ""
                                : ""
                        )}
                    >
                        Library
                    </button>
                    <button
                        onClick={() => setMobileView("canvas")}
                        className={cn(
                            "flex-1 py-2 px-4",
                            mobileView === "canvas"
                                ? ""
                                : ""
                        )}
                    >
                        Canvas
                    </button>
                </div>

                {/* Main Content Area - Split Pane */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel - Question Library */}
                    <div className={cn(
                        "hidden lg:block transition-all duration-300 relative z-10",
                        mobileView === "library" && "block lg:hidden w-full"
                    )}>
                        <QuestionLibrary
                            isCollapsed={isLibraryCollapsed}
                            cohortData={cohortData}
                            setCohortData={setCohortData}
                            showThankYouPage={showThankYouPage}
                            setShowThankYouPage={setShowThankYouPage}
                        />
                    </div>

                    {/* Center Panel - Form Canvas */}
                    <div className={cn(
                        "hidden lg:block lg:flex-1 h-full w-full relative",
                        mobileView === "canvas" && "block lg:flex-1 w-full h-full"
                    )}>
                        <div className="absolute inset-0 overflow-y-auto">
                            <FormCanvas
                                sections={sections}
                                setSections={setSections}
                                showCoverPage={showCoverPage}
                                showThankYouPage={showThankYouPage}
                                setShowThankYouPage={setShowThankYouPage}
                                activeId={activeId}
                                coverImage={coverImage}
                                setCoverImage={setCoverImage}
                                logo={logo}
                                setLogo={setLogo}
                                cohortData={cohortData}
                                setCohortData={setCohortData}
                                onPreview={() => setIsPreviewOpen(true)}
                            />
                        </div>
                    </div>
                </div>

                {/* Preview Sheet */}
                <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <SheetContent showClose={false} className="!w-[50vw] !max-w-[50vw]">
                        <SheetTitle className="sr-only">Form Preview</SheetTitle>
                        <FormPreview
                            sections={sections}
                            showCoverPage={showCoverPage}
                            showThankYouPage={showThankYouPage}
                            coverImage={coverImage}
                            logo={logo}
                            cohortData={cohortData}
                        />
                    </SheetContent>
                </Sheet>
            </div>

            <DragOverlay dropAnimation={null}>
                {activeId ? (
                    <div className="bg-white border border-blue-500 rounded-xl p-4 w-80 cursor-grabbing pointer-events-none ring-4 ring-blue-500/10 transition-transform duration-200">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                {(() => {
                                    let Icon = Type;
                                    if (activeId.startsWith("library-")) {
                                        Icon = getIconForType(activeId.replace("library-", ""));
                                    } else {
                                        const question = sections.flatMap(s => s.questions).find(q => q.id === activeId);
                                        if (question) Icon = question.icon;
                                    }
                                    return <Icon className="w-4 h-4 text-blue-600" />;
                                })()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-0.5">
                                    {activeId.startsWith("library-") ? "Adding Component" : "Moving Item"}
                                </div>
                                <div className="text-sm font-bold text-gray-900 truncate">
                                    {activeId.startsWith("library-")
                                        ? activeId.replace("library-", "").split("-").map(p => p[0].toUpperCase() + p.slice(1)).join(" ")
                                        : sections.find(s => s.id === activeId)
                                            ? sections.find(s => s.id === activeId)?.title
                                            : sections.flatMap(s => s.questions).find(q => q.id === activeId)?.text || "Question Card"
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext >
    );
}
