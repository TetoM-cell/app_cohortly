"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TemplateCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onSelect: () => void;
}

export function TemplateCard({ title, description, icon, onSelect }: TemplateCardProps) {
    return (
        <div className="min-w-[280px] bg-white border border-gray-100 rounded-xl p-6 flex flex-col gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group">
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-black group-hover:bg-gray-100 transition-colors">
                {icon}
            </div>
            <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">{title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{description}</p>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="w-full justify-between items-center h-9 font-medium text-xs hover:bg-black hover:text-white transition-all group-hover:border-black"
                onClick={onSelect}
            >
                Use this template
                <ArrowRight className="w-3 h-3" />
            </Button>
        </div>
    );
}
