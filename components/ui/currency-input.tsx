"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DollarSign } from "lucide-react";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: string;
    onChange?: (value: string) => void;
    containerClassName?: string;
    symbol?: string;
}

export function CurrencyInput({
    value = "",
    onChange,
    className,
    containerClassName,
    symbol = "$",
    ...props
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState("");

    // Initialize display value from raw numeric string
    useEffect(() => {
        if (value) {
            // strip non numeric
            const numericValue = value.replace(/[^\d]/g, '');
            if (numericValue) {
                setDisplayValue(Number(numericValue).toLocaleString('en-US'));
            } else {
                setDisplayValue("");
            }
        } else {
            setDisplayValue("");
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^\d]/g, '');

        if (!rawValue) {
            setDisplayValue("");
            if (onChange) onChange("");
            return;
        }

        const formatted = Number(rawValue).toLocaleString('en-US');
        setDisplayValue(formatted);

        if (onChange) {
            onChange(rawValue); // pass raw number back to parent state
        }
    };

    return (
        <div className={cn("relative flex items-center bg-gray-50/50 border border-gray-200 rounded-xl focus-within:ring-4 focus-within:ring-blue-600/5 focus-within:border-blue-600 transition-all", containerClassName)}>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 font-medium">
                {symbol}
            </div>
            <input
                type="text"
                inputMode="numeric"
                className={cn("w-full bg-transparent border-none pl-8 pr-4 py-3 text-sm outline-none placeholder:text-gray-400 text-gray-900", className)}
                value={displayValue}
                onChange={handleChange}
                placeholder="0"
                {...props}
            />
        </div>
    );
}
