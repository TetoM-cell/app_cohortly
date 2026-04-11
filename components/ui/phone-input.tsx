"use client";

import React from "react";
import { cn } from "@/lib/utils";
import PhoneInputLib from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: string;
    onChange?: (value: string) => void;
    containerClassName?: string;
}

export function PhoneInput({ value = "", onChange, className, containerClassName, ...props }: PhoneInputProps) {
    return (
        <div className={cn(
            "relative flex items-center bg-gray-50/50 border border-gray-200 rounded-xl focus-within:ring-4 focus-within:ring-blue-600/5 focus-within:border-blue-600 transition-all",
            "[&_.PhoneInput]:w-full [&_.PhoneInput]:h-full",
            "[&_.PhoneInputCountry]:pl-4 [&_.PhoneInputCountry]:mr-2",
            "[&_.PhoneInputCountryIcon]:h-4 [&_.PhoneInputCountryIcon]:w-auto [&_.PhoneInputCountryIcon]:shadow-none",
            "[&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:border-none [&_.PhoneInputInput]:py-3 [&_.PhoneInputInput]:pr-4 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:placeholder:text-gray-400 [&_.PhoneInputInput]:text-gray-900",
            containerClassName
        )}>
            <PhoneInputLib
                international
                defaultCountry="US"
                placeholder="000-000-0000"
                value={value}
                onChange={(val) => onChange?.(val ? String(val) : "")}
                className={cn("w-full h-full flex items-center", className)}
            />
        </div>
    );
}
