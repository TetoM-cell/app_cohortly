"use client";

import React, { useState } from "react";
import { Upload, Users, Database, ChevronRight, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { parseMigrationFile, importCohortFromSnapshot } from "@/lib/migration";
import { ImportApplicantsModal } from "@/app/(pages)/dashboard/components/import-applicants-modal";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function ImportSettings() {
    const [isImporting, setIsImporting] = useState(false);
    const [programs, setPrograms] = useState<any[]>([]);
    const [selectedProgramId, setSelectedProgramId] = useState<string>("");
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const jsonInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const fetchPrograms = async () => {
            const { data } = await supabase.from('programs').select('id, name').order('created_at', { ascending: false });
            if (data) setPrograms(data);
        };
        fetchPrograms();
    }, []);

    const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const payload = await parseMigrationFile(file);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Authentication required.");

            const { programId, applicantCount } = await importCohortFromSnapshot(payload, user.id, supabase);
            toast.success(`Migration successful! Created program with ${applicantCount} applicants.`, { duration: 5000 });
            
            // Allow immediate redirect or refresh
            window.location.href = `/dashboard?id=${programId}`;
        } catch (error: any) {
            toast.error(error.message || "Failed to import cohort snapshot.");
        } finally {
            setIsImporting(false);
            if (jsonInputRef.current) jsonInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900">Import Data</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    Bring in applicants from spreadsheets or migrate full cohorts from other workspaces.
                </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Import Applicants (CSV) */}
                <div className="flex flex-col p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                            <FileSpreadsheet className="w-5 h-5 text-gray-700" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900">Import Applicants</h4>
                            <p className="text-xs text-gray-500">From a CSV spreadsheet</p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 flex-1">
                        Use this to batch-upload applicants into an existing program. We automatically map columns like Name, Email, and Company.
                    </div>
                    <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                        <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                            <SelectTrigger className="w-full h-9 text-xs">
                                <SelectValue placeholder="Select target cohort" />
                            </SelectTrigger>
                            <SelectContent>
                                {programs.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button 
                            variant="outline" 
                            className="w-full text-xs font-semibold h-8 bg-white" 
                            disabled={!selectedProgramId}
                            onClick={() => setIsCsvModalOpen(true)}
                        >
                            Import Applicants
                        </Button>
                    </div>
                </div>

                <ImportApplicantsModal 
                    isOpen={isCsvModalOpen}
                    onOpenChange={setIsCsvModalOpen}
                    programId={selectedProgramId}
                />

                {/* 2. Import Full Cohort (JSON) */}
                <div className="flex flex-col p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                            <FileJson className="w-5 h-5 text-gray-700" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900">Migrate Cohort</h4>
                            <p className="text-xs text-gray-500">From a JSON snapshot</p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 flex-1">
                        Restore or migrate an entire cohort, including its settings, form configurations, rubrics, and all applicant records.
                    </div>
                    <div className="mt-5 pt-4 border-t border-gray-100 relative">
                        <Button 
                            className="w-full text-xs font-semibold h-8 bg-gray-900 text-white hover:bg-gray-800" 
                            disabled={isImporting}
                            onClick={() => jsonInputRef.current?.click()}
                        >
                            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                            {isImporting ? "Migrating..." : "Upload Snapshot"}
                        </Button>
                        <input
                            type="file"
                            accept=".json"
                            ref={jsonInputRef}
                            onChange={handleJsonUpload}
                            className="hidden"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
