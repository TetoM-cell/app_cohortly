"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Upload, Zap, MapPin, UserPlus, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";


import { Question, Section } from "./form-builder";
import { PhoneInput } from "@/components/ui/phone-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DiversityInput } from "@/components/ui/diversity-input";

interface FormPreviewProps {
    className?: string;
    sections: Section[];
    showCoverPage: boolean;
    showThankYouPage: boolean;
    coverImage: string | null;
    logo: string | null;
    cohortData: any;
}

export function FormPreview({ className, sections, showCoverPage, showThankYouPage, coverImage, logo, cohortData }: FormPreviewProps) {
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [currentStep, setCurrentStep] = useState(0);
    const [previewResponses, setPreviewResponses] = useState<Record<string, string>>({});

    // Check if any question in the form has logic
    const hasLogic = useMemo(() => {
        return sections.some(section =>
            section.questions.some(q => q.hasLogic)
        );
    }, [sections]);

    // Evaluate if a question should be visible based on its conditions
    const evaluateQuestionVisibility = (question: Question): boolean => {
        if (!question.hasLogic || !question.conditions || question.conditions.length === 0) {
            return true; // No logic, always visible
        }

        const results = question.conditions.map(condition => {
            const responseValue = previewResponses[condition.questionId];

            if (!responseValue) return false; // No response yet

            switch (condition.operator) {
                case "is":
                    return responseValue === condition.value;
                case "is not":
                    return responseValue !== condition.value;
                case "contains":
                    return responseValue.toLowerCase().includes(condition.value.toLowerCase());
                case "does not contain":
                    return !responseValue.toLowerCase().includes(condition.value.toLowerCase());
                case "greater than":
                    return parseFloat(responseValue) > parseFloat(condition.value);
                case "less than":
                    return parseFloat(responseValue) < parseFloat(condition.value);
                default:
                    return true;
            }
        });

        // Apply AND/OR logic
        return question.logicOperator === "all"
            ? results.every(r => r) // AND - all must be true
            : results.some(r => r);  // OR - at least one must be true
    };

    // Get visible questions for current section
    const getVisibleQuestions = (sectionQuestions: Question[]) => {
        return sectionQuestions.filter(q => evaluateQuestionVisibility(q));
    };

    // Calculate progress based on visible questions only
    const calculateProgress = () => {
        const totalVisibleQuestions = sections.reduce((sum, section) => {
            return sum + getVisibleQuestions(section.questions).length;
        }, 0);

        const totalSteps = (showCoverPage ? 1 : 0) + sections.length + (showThankYouPage ? 1 : 0);
        return ((currentStep + 1) / totalSteps) * 100;
    };

    const progress = calculateProgress();

    const updateResponse = (questionId: string, value: string) => {
        setPreviewResponses(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    // Mock data for cover and thank you pages
    const formData = {
        coverPage: {
            title: "Summer 2026 Accelerator Application",
            description: "Welcome! We're excited to learn more about your startup.",
            hasLogo: false,
        },
        thankYouPage: {
            title: "Thank you for applying!",
            message: "We'll review your application and get back to you soon.",
        },
    };

    const totalSteps = (showCoverPage ? 1 : 0) + sections.length + (showThankYouPage ? 1 : 0);

    return (
        <div className={cn("w-full bg-white flex flex-col h-full", className)}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">Live Preview</h3>
                            {hasLogic && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-semibold tracking-wide uppercase">
                                    <Zap className="w-3 h-3" />
                                    Logic active
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">Applicant view</p>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("desktop")}
                            className={cn(
                                "p-1.5 rounded transition-colors",
                                viewMode === "desktop" ? "bg-white shadow-sm" : "hover:bg-gray-200"
                            )}
                        >
                            <Monitor className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <button
                            onClick={() => setViewMode("mobile")}
                            className={cn(
                                "p-1.5 rounded transition-colors",
                                viewMode === "mobile" ? "bg-white shadow-sm" : "hover:bg-gray-200"
                            )}
                        >
                            <Smartphone className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>



            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className={cn(
                    "mx-auto bg-white shadow-lg min-h-full transition-all duration-300",
                    viewMode === "mobile" ? "max-w-[375px] min-h-[calc(100%-2rem)] my-4 rounded-[30px] border-[8px] border-gray-900 shadow-xl overflow-hidden" : "max-w-3xl min-h-full bg-white shadow-sm"
                )}>
                    <div className="p-8 space-y-12">
                        {/* Cover Page Section */}
                        {showCoverPage && (
                            <div className="space-y-6 pb-8 border-b border-gray-100 -mx-8 -mt-8">
                                {coverImage && (
                                    <div className="h-48 w-full overflow-hidden">
                                        <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="px-8 pt-6 space-y-6">
                                    {logo && (
                                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100">
                                            <img src={logo} alt="Logo" className="w-full h-full object-contain bg-gray-50" />
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                                            {cohortData.name || "Untitled Application"}
                                        </h1>
                                        <p className="text-lg text-gray-600 leading-relaxed">
                                            {cohortData.description || "No description provided."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* All Sections */}
                        {sections.map((section, index) => {
                            const visibleQuestions = getVisibleQuestions(section.questions);
                            if (visibleQuestions.length === 0) return null;

                            return (
                                <div key={section.id} className="space-y-6">
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-bold text-gray-900">
                                            {section.title}
                                        </h2>
                                        <p className="text-gray-600 text-sm">
                                            {section.description}
                                        </p>
                                    </div>

                                    <div className="space-y-6 pl-4 border-l-2 border-gray-100">
                                        {/* Auto-injected Full Name Field */}
                                        {index === 0 && cohortData.collectName && (
                                            <div className="space-y-3 pb-6 border-b border-gray-50 mb-6">
                                                <div className="space-y-1">
                                                    <label className="block text-sm font-semibold text-gray-900 leading-none">
                                                        Full Name
                                                        <span className="text-red-500 ml-1">*</span>
                                                    </label>
                                                    <p className="text-xs text-gray-500">We'll use this to register your application.</p>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Enter your full name"
                                                    disabled
                                                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm outline-none transition-all placeholder:text-gray-400 opacity-70 cursor-not-allowed"
                                                />
                                            </div>
                                        )}

                                        {visibleQuestions.map((question) => (
                                            <div key={question.id} className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="block text-sm font-semibold text-gray-900 leading-none">
                                                        {question.text || "Untitled Question"}
                                                        {question.required && (
                                                            <span className="text-red-500 ml-1">*</span>
                                                        )}
                                                    </label>
                                                    {question.description && (
                                                        <p className="text-xs text-gray-500">{question.description}</p>
                                                    )}
                                                </div>

                                                {/* Render Different Question Types */}
                                                {(() => {
                                                    const value = previewResponses[question.id] || "";
                                                    const commonInputClasses = "w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400";

                                                    switch (question.type) {
                                                        case "short-text":
                                                        case "email":
                                                        case "traction":
                                                            return (
                                                                <input
                                                                    type={question.type === "email" ? "email" : "text"}
                                                                    value={value}
                                                                    onChange={(e) => updateResponse(question.id, e.target.value)}
                                                                    placeholder={
                                                                        question.type === "email" ? "name@example.com" :
                                                                            "Type your answer here..."
                                                                    }
                                                                    className={commonInputClasses}
                                                                />
                                                            );

                                                        case "phone":
                                                            return (
                                                                <PhoneInput
                                                                    value={value}
                                                                    onChange={(val) => updateResponse(question.id, val)}
                                                                />
                                                            );

                                                        case "funding-raised":
                                                        case "revenue":
                                                            return (
                                                                <CurrencyInput
                                                                    value={value}
                                                                    onChange={(val) => updateResponse(question.id, val)}
                                                                />
                                                            );

                                                        case "diversity":
                                                            return (
                                                                <DiversityInput
                                                                    value={value}
                                                                    onChange={(val) => updateResponse(question.id, val)}
                                                                />
                                                            );

                                                        case "long-text":
                                                        case "statement":
                                                            return (
                                                                <textarea
                                                                    value={value}
                                                                    onChange={(e) => updateResponse(question.id, e.target.value)}
                                                                    placeholder="Type your answer here..."
                                                                    rows={4}
                                                                    className={cn(commonInputClasses, "resize-none")}
                                                                />
                                                            );

                                                        case "date":
                                                            return (
                                                                <input
                                                                    type="date"
                                                                    value={value}
                                                                    onChange={(e) => updateResponse(question.id, e.target.value)}
                                                                    className={commonInputClasses}
                                                                />
                                                            );

                                                        case "file-upload":
                                                        case "video-pitch":
                                                        case "image-upload":
                                                            return (
                                                                <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer bg-gray-50/50 group">
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept={question.type === 'video-pitch' ? 'video/*' : question.type === 'image-upload' ? 'image/*' : '*/*'}
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                updateResponse(question.id, file.name);
                                                                            }
                                                                        }}
                                                                    />
                                                                    {value ? (
                                                                        <div className="flex flex-col items-center justify-center">
                                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                                                                                <span className="text-emerald-600 font-bold text-lg">✓</span>
                                                                            </div>
                                                                            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{value}</p>
                                                                            <p className="text-xs text-blue-600 mt-1">Click to change file</p>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3 group-hover:text-blue-500 transition-colors" />
                                                                            <p className="text-sm font-medium text-gray-700">
                                                                                {question.type === "video-pitch" ? "Record or upload video" : "Click to upload or drag and drop"}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                {question.maxFileSize ? `Max size: ${question.maxFileSize}MB` : "Maximum file size: 10MB"}
                                                                            </p>
                                                                        </>
                                                                    )}
                                                                </label>
                                                            );

                                                        case "multiple-choice":
                                                        case "checkboxes":
                                                            return (
                                                                <div className="space-y-2">
                                                                    {(question.options || []).map((option, idx) => (
                                                                        <label key={idx} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                                                                            <input
                                                                                type={question.type === "multiple-choice" ? "radio" : "checkbox"}
                                                                                name={question.id}
                                                                                className={cn(
                                                                                    "w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500",
                                                                                    question.type === "multiple-choice" ? "rounded-full" : "rounded"
                                                                                )}
                                                                                checked={question.type === "multiple-choice" ? value === option : value.includes(option)}
                                                                                onChange={(e) => {
                                                                                    if (question.type === "multiple-choice") {
                                                                                        updateResponse(question.id, option);
                                                                                    } else {
                                                                                        const currentValues = value ? value.split(",") : [];
                                                                                        const nextValues = e.target.checked
                                                                                            ? [...currentValues, option]
                                                                                            : currentValues.filter(v => v !== option);
                                                                                        updateResponse(question.id, nextValues.join(","));
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <span className="text-sm text-gray-700">{option}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            );

                                                        case "dropdown":
                                                            return (
                                                                <select
                                                                    value={value}
                                                                    onChange={(e) => updateResponse(question.id, e.target.value)}
                                                                    className={cn(commonInputClasses, "appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]")}
                                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                                                >
                                                                    <option value="">Select an option...</option>
                                                                    {(question.options || []).map((option, idx) => (
                                                                        <option key={idx} value={option}>{option}</option>
                                                                    ))}
                                                                </select>
                                                            );

                                                        case "location":
                                                            return (
                                                                <div className="relative">
                                                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Search for a location..."
                                                                        className={cn(commonInputClasses, "pl-10")}
                                                                        value={value}
                                                                        onChange={(e) => updateResponse(question.id, e.target.value)}
                                                                    />
                                                                </div>
                                                            );

                                                        case "team-invites":
                                                            return (
                                                                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 hover:bg-white transition-all focus-within:ring-4 focus-within:ring-blue-600/5 focus-within:border-blue-600">
                                                                    <div className="flex items-center gap-3 mb-2 text-sm font-semibold text-gray-700">
                                                                        <UserPlus className="w-4 h-4 text-blue-600" />
                                                                        Collaborator Email Addresses
                                                                    </div>
                                                                    <textarea
                                                                        placeholder="Enter email addresses separated by commas..."
                                                                        className="min-h-[80px] w-full text-sm resize-none bg-transparent border-none p-0 outline-none placeholder:text-gray-400"
                                                                        value={value}
                                                                        onChange={(e) => updateResponse(question.id, e.target.value)}
                                                                    />
                                                                </div>
                                                            );

                                                        case "references":
                                                            return (
                                                                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 hover:bg-white transition-all focus-within:ring-4 focus-within:ring-blue-600/5 focus-within:border-blue-600">
                                                                    <div className="flex items-center gap-3 mb-2 text-sm font-semibold text-gray-700">
                                                                        <LinkIcon className="w-4 h-4 text-blue-600" />
                                                                        Reference Contact Information
                                                                    </div>
                                                                    <textarea
                                                                        placeholder="Enter names, emails, and phone numbers of your references..."
                                                                        className="min-h-[80px] w-full text-sm resize-none bg-transparent border-none p-0 outline-none placeholder:text-gray-400"
                                                                        value={value}
                                                                        onChange={(e) => updateResponse(question.id, e.target.value)}
                                                                    />
                                                                </div>
                                                            );

                                                        default:
                                                            return <p className="text-xs text-gray-400 italic">Preview not available for this type yet</p>;
                                                    }
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {/* Thank You Page Section */}
                        {showThankYouPage && (
                            <div className="space-y-6 pt-8 border-t border-gray-100 text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        {formData.thankYouPage.title}
                                    </h1>
                                    <p className="text-lg text-gray-600">
                                        {formData.thankYouPage.message}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>


        </div>
    );
}
