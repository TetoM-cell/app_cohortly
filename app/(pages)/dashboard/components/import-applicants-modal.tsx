"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    Download, 
    Upload, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Loader2,
    Database,
    Binary
} from "lucide-react";
import { parseCSVText, insertApplications, ParseResult, DuplicateMode } from "@/lib/import";
import { downloadImportTemplate } from "@/lib/export";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportApplicantsModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    programId: string;
    onSuccess?: () => void;
}

export function ImportApplicantsModal({
    isOpen,
    onOpenChange,
    programId,
    onSuccess,
}: ImportApplicantsModalProps) {
    const [file, setFile] = React.useState<File | null>(null);
    const [parseResult, setParseResult] = React.useState<ParseResult | null>(null);
    const [isParsing, setIsParsing] = React.useState(false);
    const [isImporting, setIsImporting] = React.useState(false);
    const [duplicateMode, setDuplicateMode] = React.useState<DuplicateMode>("skip");
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const reset = () => {
        setFile(null);
        setParseResult(null);
        setIsParsing(false);
        setIsImporting(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsParsing(true);

        try {
            const text = await selectedFile.text();
            const result = parseCSVText(text);
            setParseResult(result);
            
            if (result.errors.length > 0) {
                toast.warning(`Note: ${result.errors.length} rows had errors and will be skipped.`);
            }
        } catch (error) {
            toast.error("Failed to parse CSV file.");
            console.error(error);
        } finally {
            setIsParsing(false);
        }
    };

    const handleImport = async () => {
        if (!parseResult || parseResult.rows.length === 0) return;

        setIsImporting(true);
        try {
            const result = await insertApplications(
                parseResult.rows,
                programId,
                duplicateMode,
                supabase
            );

            if (result.errors.length > 0) {
                toast.error(`${result.errors.length} rows failed to import.`);
            }

            toast.success(`Successfully imported ${result.inserted} applicants.`);
            if (result.skipped > 0) {
                toast.info(`${result.skipped} duplicates skipped.`);
            }

            onSuccess?.();
            onOpenChange(false);
            reset();
        } catch (error) {
            toast.error("An unexpected error occurred during import.");
            console.error(error);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!isImporting) {
                onOpenChange(open);
                if (!open) reset();
            }
        }}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Database className="w-5 h-5 text-blue-600" />
                            Import Applicants
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 mt-1">
                            Upload a spreadsheet to bulk-add applicants to this program.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Step 1: Upload or Template */}
                    {!file ? (
                        <div className="space-y-4">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                            >
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-900">Click to upload or drag and drop</p>
                                    <p className="text-xs text-gray-500 mt-1">CSV files only (max 5MB)</p>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept=".csv"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Need a template?</p>
                                        <p className="text-xs text-gray-500">Download our pre-formatted CSV</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 gap-2 bg-white"
                                    onClick={() => downloadImportTemplate()}
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Template
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Preview & Config */
                        <div className="space-y-5">
                            <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-blue-200">
                                        <Binary className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-blue-900 truncate max-w-[200px]">{file.name}</p>
                                        <p className="text-xs text-blue-600/70">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
                                    onClick={reset}
                                    disabled={isImporting}
                                >
                                    Replace
                                </Button>
                            </div>

                            {isParsing ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                    <p className="text-sm text-gray-500">Analyzing data...</p>
                                </div>
                            ) : parseResult && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 rounded-xl border border-gray-100 bg-white">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Rows</span>
                                            </div>
                                            <p className="text-2xl font-semibold text-gray-900">{parseResult.rows.length}</p>
                                        </div>
                                        <div className={cn(
                                            "p-4 rounded-xl border bg-white",
                                            parseResult.errors.length > 0 ? "border-amber-100" : "border-gray-100"
                                        )}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertCircle className={cn(
                                                    "w-4 h-4",
                                                    parseResult.errors.length > 0 ? "text-amber-500" : "text-gray-300"
                                                )} />
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">With Errors</span>
                                            </div>
                                            <p className="text-2xl font-semibold text-gray-900">{parseResult.errors.length}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Handles duplicates (by email)</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setDuplicateMode("skip")}
                                                className={cn(
                                                    "flex flex-col gap-1 p-3 text-left rounded-xl border transition-all",
                                                    duplicateMode === "skip" 
                                                        ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500" 
                                                        : "border-gray-100 hover:border-gray-200"
                                                )}
                                            >
                                                <span className="text-sm font-medium">Skip</span>
                                                <span className="text-xs text-gray-500">Keep existing data</span>
                                            </button>
                                            <button
                                                onClick={() => setDuplicateMode("overwrite")}
                                                className={cn(
                                                    "flex flex-col gap-1 p-3 text-left rounded-xl border transition-all",
                                                    duplicateMode === "overwrite" 
                                                        ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500" 
                                                        : "border-gray-100 hover:border-gray-200"
                                                )}
                                            >
                                                <span className="text-sm font-medium">Overwrite</span>
                                                <span className="text-xs text-gray-500">Update with new data</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50/80 border-t border-gray-100">
                    <DialogFooter className="flex sm:justify-between items-center w-full">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isImporting}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={!file || isParsing || isImporting || (parseResult?.rows.length === 0)}
                            onClick={handleImport}
                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] gap-2 rounded-xl"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    Start Import
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
