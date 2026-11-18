"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
    Search, GripVertical, Type, AlignLeft, Mail, Phone, Calendar, Info,
    Upload, Video, Image, ListChecks, ChevronDown, MapPin,
    DollarSign, TrendingUp, Users, FileText, UserPlus, Link as LinkIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface QuestionType {
    id: string;
    icon: React.ElementType;
    label: string;
    description: string;
}

interface QuestionCategory {
    id: string;
    label: string;
    questions: QuestionType[];
}

const QUESTION_CATEGORIES: QuestionCategory[] = [
    {
        id: "basic",
        label: "Basic",
        questions: [
            { id: "short-text", icon: Type, label: "Short Text", description: "Single line input" },
            { id: "long-text", icon: AlignLeft, label: "Long Text", description: "Multi-line textarea" },
            { id: "email", icon: Mail, label: "Email", description: "Email validation" },
            { id: "phone", icon: Phone, label: "Phone", description: "Phone number" },
            { id: "date", icon: Calendar, label: "Date", description: "Date picker" },
        ],
    },
    {
        id: "files-media",
        label: "Files & Media",
        questions: [
            { id: "file-upload", icon: Upload, label: "File Upload", description: "Document upload" },
            { id: "video-pitch", icon: Video, label: "Video Pitch", description: "Video recording" },
            { id: "image-upload", icon: Image, label: "Image Upload", description: "Image files" },
        ],
    },
    {
        id: "choices",
        label: "Choices",
        questions: [
            { id: "multiple-choice", icon: ListChecks, label: "Multiple Choice", description: "Radio buttons" },
            { id: "checkboxes", icon: ListChecks, label: "Checkboxes", description: "Multiple selections" },
            { id: "dropdown", icon: ChevronDown, label: "Dropdown", description: "Select menu" },
        ],
    },
    {
        id: "startup-grant",
        label: "Startup/Grant Specific",
        questions: [
            { id: "funding-raised", icon: DollarSign, label: "Funding Raised", description: "Investment amount" },
            { id: "revenue", icon: TrendingUp, label: "Revenue", description: "Financial metrics" },
            { id: "traction", icon: TrendingUp, label: "Current Traction", description: "Growth metrics" },
            { id: "location", icon: MapPin, label: "Location", description: "Geographic info" },
            { id: "diversity", icon: Users, label: "Diversity Info", description: "DEI information" },
        ],
    },
    {
        id: "advanced",
        label: "Advanced",
        questions: [
            { id: "team-invites", icon: UserPlus, label: "Team Member Invites", description: "Invite co-applicants" },
            { id: "references", icon: LinkIcon, label: "References", description: "Reference contacts" },
            { id: "statement", icon: FileText, label: "Statement of Purpose", description: "Long-form essay" },
        ],
    },
];

interface QuestionLibraryProps {
    isCollapsed?: boolean;
    cohortData: { collectName: boolean };
    setCohortData: React.Dispatch<React.SetStateAction<any>>;
    showThankYouPage: boolean;
    setShowThankYouPage: React.Dispatch<React.SetStateAction<boolean>>;
}

export function QuestionLibrary({
    isCollapsed = false,
    cohortData,
    setCohortData,
    showThankYouPage,
    setShowThankYouPage,
}: QuestionLibraryProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<string[]>(["basic", "files-media", "choices", "startup-grant", "advanced"]);
    const { setNodeRef: setLibraryDropRef } = useDroppable({ id: "question-library-drop-zone" });

    // Filter questions based on search
    const filteredCategories = QUESTION_CATEGORIES.map(category => ({
        ...category,
        questions: category.questions.filter(q =>
            q.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    })).filter(category => category.questions.length > 0);

    if (isCollapsed) {
        return (
            <div ref={setLibraryDropRef} className="w-16 h-[calc(100%-1.5rem)] my-3 ml-3 rounded-md border bg-card flex flex-col items-center py-6 gap-6">
                <Search className="w-5 h-5" />
                <div className="flex-1 w-full flex flex-col items-center gap-4">
                    {QUESTION_CATEGORIES.slice(0, 4).map(cat => {
                        const Icon = cat.questions[0].icon;
                        return (
                            <div key={cat.id} className="w-8 h-8 flex items-center justify-center">
                                <Icon className="w-4 h-4" />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div ref={setLibraryDropRef} className="w-80 h-[calc(100%-1.5rem)] my-3 ml-3 rounded-md border bg-card flex flex-col">
            {/* Header */}
            <div className="p-5 space-y-4">
                <div>
                    <h3 className="text-sm font-semibold font-playfair">Toolbox</h3>
                    <p className="mt-1 text-xs text-muted-foreground font-sans">Question Library</p>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <Input
                        type="text"
                        placeholder="Search components..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="collect-applicant-name"
                        checked={cohortData.collectName}
                        onCheckedChange={(checked) => setCohortData((current: any) => ({ ...current, collectName: checked === true }))}
                    />
                    <Label htmlFor="collect-applicant-name" className="text-sm font-medium">
                        Collect Applicant Name
                    </Label>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="size-4 text-muted-foreground" aria-label="Applicant name information" />
                            </TooltipTrigger>
                            <TooltipContent>
                                By checking this, a mandatory &apos;Full name&apos; field is added to your form
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="thank-you-page"
                        checked={showThankYouPage}
                        onCheckedChange={(checked) => setShowThankYouPage(checked === true)}
                    />
                    <Label htmlFor="thank-you-page" className="text-sm font-medium">
                        Thank you page
                    </Label>
                </div>
            </div>

            {/* Question Categories */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                <Accordion
                    type="multiple"
                    value={expandedCategories}
                    onValueChange={setExpandedCategories}
                    className="w-full space-y-6"
                >
                    {filteredCategories.map((category) => (
                        <AccordionItem key={category.id} value={category.id} className="border-none">
                            <AccordionTrigger className="py-2 hover:bg-transparent text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black hover:no-underline transition-colors">
                                {category.label}
                            </AccordionTrigger>
                            <AccordionContent className="pb-0 pt-2 space-y-2.5">
                                {category.questions.map((question) => (
                                    <DraggableQuestionCard key={question.id} question={question} />
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>

                {/* No Results */}
                {filteredCategories.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                            <Search className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No components found</p>
                        <p className="text-xs text-gray-500 mt-1">Try searching for "email" or "upload"</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <p className="text-[10px] text-gray-400 text-center font-medium">
                    Drag items to the canvas to add them
                </p>
            </div>
        </div>
    );
}

function DraggableQuestionCard({ question }: { question: QuestionType }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `library-${question.id}`,
        data: {
            type: question.id,
            isLibraryItem: true,
        },
    });

    const Icon = question.icon;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "group relative border border-gray-200 rounded-xl p-3.5 cursor-grab hover:border-gray-400 transition-all duration-200",
                isDragging && "border-blue-500 bg-white opacity-90 z-50",
                "active:cursor-grabbing"
            )}
        >
            <div className="flex items-start gap-3.5 text-left">
                <div className="p-2 transition-colors duration-200 group-hover:text-foreground">
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-sm font-bold text-gray-900 group-hover:text-foreground">{question.label}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 font-medium leading-normal group-hover:text-foreground">{question.description}</div>
                </div>
            </div>
            <GripVertical className="absolute top-1/2 -translate-y-1/2 right-2 w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
