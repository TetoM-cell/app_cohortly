"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Plus, XCircle, ShieldAlert, Loader2, Type, CircleDot, Clipboard, Calendar, User, Hash } from "lucide-react";
import { format } from "date-fns";

// 🔒 IMPORTANT: Change this to your actual admin email
const ADMIN_EMAIL = "marcuscryo@gmail.com";

interface BetaCode {
    id: string;
    code: string;
    is_used: boolean;
    used_by: string | null;
    created_at: string;
    expires_at: string;
    profiles?: { email: string };
}

export default function BetaCodesAdmin() {
    const router = useRouter();
    const [codes, setCodes] = useState<BetaCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Initial Authorization Check
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            const userEmail = user?.email?.toLowerCase()?.trim();
            const targetEmail = ADMIN_EMAIL.toLowerCase().trim();

            console.log("[Admin Check] User:", userEmail, "| Target:", targetEmail);

            if (!user || userEmail !== targetEmail) {
                console.warn("[Admin] Unauthorized attempt from:", userEmail);
                toast.error("Unauthorized access. Admins only.");
                router.replace("/home"); 
                return;
            }
            setIsAuthorized(true);
            fetchCodes();
        };

        checkAuth();
    }, [router]);

    const fetchCodes = async (silent = false) => {
        if (!silent) setLoading(true);
        // Fallback to strict select since beta_codes references auth.users and not profiles
        const { data, error } = await supabase
            .from('beta_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to fetch codes: " + error.message);
        } else {
            setCodes(data || []);
        }
        setLoading(false);
    };

    const handleGenerateCode = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        
        try {
            // Generate a more robust random 6-character string
            const array = new Uint32Array(1);
            window.crypto.getRandomValues(array);
            const randomStr = array[0].toString(36).substring(0, 6).toUpperCase().padEnd(6, '0');
            const newCode = `COHORTLY-${randomStr}`;

            const { error } = await supabase
                .from('beta_codes')
                .insert([{ code: newCode }]);

            if (error) {
                // If it's a conflict error, just try again once
                if (error.code === '23505') {
                    return handleGenerateCode();
                }
                throw error;
            }

            toast.success("New beta code generated successfully.");
            await fetchCodes(true); // Silent fetch to keep UI stable
        } catch (error: any) {
            toast.error("Failed to generate code: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Code copied to clipboard!");
    };

    const handleDeactivate = async (id: string, code: string) => {
        if (!confirm(`Are you sure you want to deactivate ${code}?`)) return;

        try {
            // Deactivate simply sets expires_at to a past date
            const { error } = await supabase
                .from('beta_codes')
                .update({ expires_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            toast.success("Code deactivated successfully.");
            fetchCodes(true);
        } catch (error: any) {
            toast.error("Failed to deactivate: " + error.message);
        }
    };

    const getStatusTag = (code: BetaCode) => {
        const isExpired = new Date(code.expires_at) < new Date();

        if (code.is_used) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[12px] font-medium bg-[#e2f6d3] text-[#2b593f]">
                    Redeemed
                </span>
            );
        }
        if (isExpired) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[12px] font-medium bg-[#ffccd1] text-[#9b2c33]">
                    Expired
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[12px] font-medium bg-[#d3e5ef] text-[#28456c]">
                Active
            </span>
        );
    };

    if (!isAuthorized) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4 bg-white">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                    <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
                    <p className="font-medium text-sm">Verifying access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-full bg-white text-[#37352f] overflow-y-auto">
            {/* Header / Page Title Area */}
            <div className="max-w-7xl w-full mx-auto px-12 pt-8 pb-4">
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-[32px] font-bold tracking-tight">Beta Codes</h1>
                    <span className="px-1.5 py-0.5 mt-2 rounded bg-gray-100 text-gray-500 font-medium text-[12px]">
                        {codes.length}
                    </span>
                </div>
                <p className="text-gray-500 text-sm">Manage, generate, and revoke access codes for beta testers.</p>
            </div>

            {/* Notion Table Container */}
            <div className="max-w-7xl w-full mx-auto px-12 py-6">
                <div className="border border-[#edece9] rounded-sm overflow-hidden flex flex-col group">
                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm table-auto">
                            <thead>
                                <tr className="border-b border-[#edece9] bg-[#f7f6f3]/80">
                                    <th className="text-left font-normal text-gray-500 px-3 py-2 border-r border-[#edece9] min-w-[200px]">
                                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider">
                                            <Type className="w-3.5 h-3.5 opacity-60" />
                                            Code
                                        </div>
                                    </th>
                                    <th className="text-left font-normal text-gray-500 px-3 py-2 border-r border-[#edece9] w-[140px]">
                                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider">
                                            <CircleDot className="w-3.5 h-3.5 opacity-60" />
                                            Status
                                        </div>
                                    </th>
                                    <th className="text-center font-normal text-gray-500 px-3 py-2 border-r border-[#edece9] w-[80px]">
                                        <div className="flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-wider">
                                            <Clipboard className="w-3.5 h-3.5 opacity-60" />
                                            Copy
                                        </div>
                                    </th>
                                    <th className="text-left font-normal text-gray-500 px-3 py-2 border-r border-[#edece9] w-[150px]">
                                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider">
                                            <Calendar className="w-3.5 h-3.5 opacity-60" />
                                            Created
                                        </div>
                                    </th>
                                    <th className="text-left font-normal text-gray-500 px-3 py-2 border-r border-[#edece9] w-[150px]">
                                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider">
                                            <Calendar className="w-3.5 h-3.5 opacity-60" />
                                            Expires
                                        </div>
                                    </th>
                                    <th className="text-left font-normal text-gray-500 px-3 py-2 border-r border-[#edece9] min-w-[200px]">
                                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider">
                                            <User className="w-3.5 h-3.5 opacity-60" />
                                            Used By
                                        </div>
                                    </th>
                                    <th className="text-right font-normal text-gray-500 px-3 py-2 w-[100px]">
                                        <div className="flex items-center justify-end gap-2 text-[11px] font-medium uppercase tracking-wider px-2">
                                            Actions
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && codes.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-400">
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 opacity-30" />
                                            Loading database...
                                        </td>
                                    </tr>
                                ) : codes.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-400 text-xs">
                                            No pages found. Click below to add a new code.
                                        </td>
                                    </tr>
                                ) : (
                                    codes.map((code) => {
                                        const isExpired = new Date(code.expires_at) < new Date();
                                        const canDeactivate = !code.is_used && !isExpired;

                                        return (
                                            <tr key={code.id} className="border-b border-[#edece9] hover:bg-[#f1f0ee]/50 group/row transition-colors">
                                                <td className="px-3 py-2 border-r border-[#edece9] font-medium">
                                                    {code.code}
                                                </td>
                                                <td className="px-3 py-2 border-r border-[#edece9]">
                                                    {getStatusTag(code)}
                                                </td>
                                                <td className="px-3 py-2 border-r border-[#edece9] text-center">
                                                    <button
                                                        onClick={() => copyToClipboard(code.code)}
                                                        className="p-1 hover:bg-[#edece9] rounded text-gray-400 hover:text-[#37352f] transition-all opacity-0 group-row/row:opacity-100"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 border-r border-[#edece9] text-gray-500 tabular-nums">
                                                    {format(new Date(code.created_at), "MMM d, yyyy")}
                                                </td>
                                                <td className="px-3 py-2 border-r border-[#edece9] text-gray-500 tabular-nums">
                                                    {format(new Date(code.expires_at), "MMM d, yyyy")}
                                                </td>
                                                <td className="px-3 py-2 border-r border-[#edece9]">
                                                    {code.used_by ? (
                                                        <span className="font-mono text-[10px] text-gray-400 bg-gray-50 px-1 py-0.5 rounded border border-gray-100" title={code.used_by}>
                                                            {code.used_by.substring(0, 18)}...
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 italic text-xs">Empty</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {canDeactivate && (
                                                        <button
                                                            onClick={() => handleDeactivate(code.id, code.code)}
                                                            className="text-[11px] font-bold uppercase tracking-tight text-red-400 hover:text-red-700 opacity-0 group-row/row:opacity-100 transition-opacity"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Notion "New Row" Action */}
                    <button
                        onClick={handleGenerateCode}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-3 py-2.5 text-gray-400 hover:bg-[#f1f0ee] hover:text-[#37352f] transition-all text-sm group/new"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                        ) : (
                            <Plus className="w-4 h-4 text-gray-300 group-hover/new:text-[#37352f]" />
                        )}
                        <span>New</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
