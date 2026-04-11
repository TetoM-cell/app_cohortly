"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DiversityInputProps {
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
    readOnly?: boolean;
    disabled?: boolean;
}

export function DiversityInput({ value, onChange, className, readOnly, disabled }: DiversityInputProps) {
    const [data, setData] = useState({
        gender: "",
        race: "",
        veteran: "",
        disability: ""
    });

    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                setData({
                    gender: parsed.gender || "",
                    race: parsed.race || "",
                    veteran: parsed.veteran || "",
                    disability: parsed.disability || ""
                });
            } catch (e) {
                // Ignore parsing errors
            }
        }
    }, [value]);

    const updateField = (field: string, val: string) => {
        if (readOnly || disabled) return;
        const newData = { ...data, [field]: val };
        setData(newData);
        onChange?.(JSON.stringify(newData));
    };

    const selectClass = "w-full h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400 appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em] disabled:opacity-50 disabled:cursor-not-allowed";
    const selectStyle = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` };

    return (
        <div className={cn("space-y-4 p-5 border border-gray-200 rounded-xl bg-white", className)}>
            <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Gender Identity</label>
                <select
                    value={data.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className={selectClass}
                    style={selectStyle}
                    disabled={disabled || readOnly}
                >
                    <option value="">Select...</option>
                    <option value="Woman">Woman</option>
                    <option value="Man">Man</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer to self-describe">Prefer to self-describe</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Race / Ethnicity</label>
                <select
                    value={data.race}
                    onChange={(e) => updateField("race", e.target.value)}
                    className={selectClass}
                    style={selectStyle}
                    disabled={disabled || readOnly}
                >
                    <option value="">Select...</option>
                    <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                    <option value="Asian">Asian</option>
                    <option value="Black or African American">Black or African American</option>
                    <option value="Hispanic or Latino">Hispanic or Latino</option>
                    <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                    <option value="White">White</option>
                    <option value="Two or More Races">Two or More Races</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Veteran Status</label>
                <select
                    value={data.veteran}
                    onChange={(e) => updateField("veteran", e.target.value)}
                    className={selectClass}
                    style={selectStyle}
                    disabled={disabled || readOnly}
                >
                    <option value="">Select...</option>
                    <option value="I am a veteran">I am a veteran</option>
                    <option value="I am not a veteran">I am not a veteran</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Disability Status</label>
                <select
                    value={data.disability}
                    onChange={(e) => updateField("disability", e.target.value)}
                    className={selectClass}
                    style={selectStyle}
                    disabled={disabled || readOnly}
                >
                    <option value="">Select...</option>
                    <option value="Yes, I have a disability">Yes, I have a disability</option>
                    <option value="No, I do not have a disability">No, I do not have a disability</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                </select>
            </div>

            <p className="text-[10px] text-gray-400 mt-2 italic">
                This information is collected for demographic purposes only and won't be used to evaluate your application.
            </p>
        </div>
    );
}
