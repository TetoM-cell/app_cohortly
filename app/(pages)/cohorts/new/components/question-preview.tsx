"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
    Calendar, Upload, Video, Image as ImageIcon,
    DollarSign, MapPin, Users, UserPlus, Link as LinkIcon,
    ChevronDown, FileText
} from "lucide-react";
import { Question } from "./form-builder";
import { PhoneInput } from "@/components/ui/phone-input";
import { CurrencyInput } from "@/components/ui/currency-input";

interface QuestionPreviewProps {
    question: Question;
}

export function QuestionPreview({ question }: QuestionPreviewProps) {
    const renderPreview = () => {
        switch (question.type) {
            case "short-text":
            case "email":
                return (
                    <div className="h-10 w-full px-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center text-sm text-gray-400">
                        {question.type === "email" ? "name@example.com" : "Type your answer..."}
                    </div>
                );
            case "phone":
                return <PhoneInput readOnly disabled />;

            case "long-text":
            case "statement":
            case "traction":
                return (
                    <div className="min-h-[100px] w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400">
                        {question.type === "traction" ? "Describe your current traction..." : "Type your answer..."}
                    </div>
                );

            case "date":
                return (
                    <div className="h-10 w-full px-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>Pick a date...</span>
                    </div>
                );

            case "file-upload":
            case "image-upload":
            case "video-pitch":
                return (
                    <div className="w-full py-8 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center bg-gray-50/50 group-hover:border-gray-200 transition-colors">
                        {question.type === "video-pitch" ? <Video className="w-6 h-6 mb-2 text-gray-300" /> :
                            question.type === "image-upload" ? <ImageIcon className="w-6 h-6 mb-2 text-gray-300" /> :
                                <Upload className="w-6 h-6 mb-2 text-gray-300" />}
                        <p className="text-xs font-medium text-gray-400">
                            {question.type === "video-pitch" ? "Record or upload video" :
                                question.type === "image-upload" ? "Upload image" : "Drop files here or click to upload"}
                        </p>
                        <p className="text-[10px] text-gray-300 mt-1">
                            Max size: {question.maxFileSize || "10"}MB
                        </p>
                    </div>
                );

            case "multiple-choice":
            case "checkboxes":
            case "dropdown":
                if (question.type === "dropdown") {
                    return (
                        <div className="h-10 w-full px-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-sm text-gray-400">
                            <span>Select an option...</span>
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    );
                }
                return (
                    <div className="space-y-3">
                        {(question.options || ["Option 1", "Option 2"]).map((option, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className={cn(
                                    "w-4 h-4 border border-gray-300 flex-shrink-0 bg-white",
                                    question.type === "multiple-choice" ? "rounded-full" : "rounded"
                                )} />
                                <span className="text-sm text-gray-600">{option}</span>
                            </div>
                        ))}
                    </div>
                );

            case "funding-raised":
            case "revenue":
                return <CurrencyInput readOnly disabled />;

            case "location":
                return (
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="h-10 w-full pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center text-sm text-gray-400">
                            Search for a city...
                        </div>
                    </div>
                );

            case "diversity":
                return (
                    <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Demographic Preview</span>
                        </div>
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full w-1/3 bg-gray-300" />
                            </div>
                            <p className="text-[10px] text-gray-400 italic">This will expand into a standard DEI collection form.</p>
                        </div>
                    </div>
                );

            case "team-invites":
                return (
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                        <div className="flex items-center gap-3 mb-2 text-sm font-semibold text-gray-700">
                            <UserPlus className="w-4 h-4 text-blue-600" />
                            Collaborator Email Addresses
                        </div>
                        <div className="h-10 w-full px-3 border border-gray-200 rounded-xl flex items-center text-sm text-gray-400 bg-white">
                            Enter email addresses separated by commas...
                        </div>
                    </div>
                );

            case "references":
                return (
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                        <div className="flex items-center gap-3 mb-2 text-sm font-semibold text-gray-700">
                            <LinkIcon className="w-4 h-4 text-blue-600" />
                            Reference Contact Information
                        </div>
                        <div className="h-20 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-400 bg-white flex items-start">
                            Enter names, emails, and phone numbers...
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="h-10 w-full px-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center text-sm text-gray-400">
                        Type your answer...
                    </div>
                );
        }
    };

    return (
        <div className="mt-4 pointer-events-none">
            {renderPreview()}
        </div>
    );
}
