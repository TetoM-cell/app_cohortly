"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Pattern } from "./pattern-file-upload";

interface CohortBasicsProps {
    formData: {
        name: string;
        description: string;
        type: string;
        openDate: Date | undefined;
        deadline: Date | undefined;
        expectedApps: string;
    };
    setFormData: (data: any) => void;
    onNext?: () => void;
    onSave?: () => Promise<void>;
}

const PROGRAM_TYPES = [
    "Accelerator",
    "Incubator",
    "Grant",
    "Fellowship",
    "University Program",
    "Other",
];

const APPLICATION_VOLUMES = [
    "<100",
    "100–500",
    "500–1000",
    "1000+",
];

export function CohortBasics({ formData, setFormData }: CohortBasicsProps) {
    const [logo, setLogo] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Content */}
            <div>
                <h1 className="font-playfair text-3xl font-semibold tracking-tight">Create a new cohort</h1>
                <p className="mt-1 text-sm text-muted-foreground font-sans">
                    Define the foundations of your program. These details will be visible to your applicants.
                </p>
            </div>

            {/* Section 1: Core Identity */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-sans">Program Identity</CardTitle>
                    <CardDescription className="text-xs font-sans">Name and categorize your new cohort.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cohort-name">Cohort Name</Label>
                            <Input
                                id="cohort-name"
                                placeholder="e.g. Summer 2026 Accelerator"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="program-type">Program Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) => setFormData({ ...formData, type: val })}
                            >
                                <SelectTrigger id="program-type">
                                    <SelectValue placeholder="Select program type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROGRAM_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Description & Scope */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-sans">Program Details</CardTitle>
                    <CardDescription className="text-xs font-sans">Describe what this cohort offers to applicants.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FieldSet className="w-full">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="description">Public Description</FieldLabel>
                                <Textarea
                                    id="description"
                                    placeholder="What is this program about? This will be public on your application page..."
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                                <FieldDescription>
                                    Share what this program offers to applicants. This will be public on your application page.
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </FieldSet>

                    <div className="space-y-2">
                        <Label>Expected Application Volume</Label>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            value={formData.expectedApps}
                            onValueChange={(val) => {
                                if (val) setFormData({ ...formData, expectedApps: val });
                            }}
                        >
                            {APPLICATION_VOLUMES.map((vol) => (
                                <ToggleGroupItem key={vol} value={vol} aria-label={vol}>
                                    {vol}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                </CardContent>
            </Card>

            {/* Section 3: Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-sans">Program Timeline</CardTitle>
                    <CardDescription className="text-xs font-sans">Set the application window dates.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Applications Open</Label>
                            <DatePicker
                                date={formData.openDate}
                                setDate={(date) => setFormData({ ...formData, openDate: date })}
                                placeholder="Select date"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Application Deadline</Label>
                            <DatePicker
                                date={formData.deadline}
                                setDate={(date) => setFormData({ ...formData, deadline: date })}
                                placeholder="Select date"
                                minDate={formData.openDate}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 4: Branding */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-sans">Program Branding</CardTitle>
                    <CardDescription className="text-xs font-sans">Upload a logo to customize your application page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Pattern
                        maxFiles={1}
                        maxSize={5 * 1024 * 1024}
                        accept="image/*"
                        multiple={false}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
