"use client";

import React, { useState, useEffect, use } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import {
    Check,
    ChevronRight,
    ChevronLeft,
    Upload,
    Globe,
    Clock,
    Shield,
    ArrowRight,
    Save,
    CheckCircle2,
    Linkedin,
    Twitter,
    Mail,
    X,
    ArrowUpRight,
    Loader2,
    MapPin,
    UserPlus,
    Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DiversityInput } from "@/components/ui/diversity-input";
import { motion, AnimatePresence } from "framer-motion";
import { ScalingWrapper } from "@/components/scaling-wrapper";
import { FormSkeleton } from "./components/form-skeleton";

// --- Types & Placeholder Data ---

interface Condition {
    questionId: string;
    operator: string;
    value: string;
}

interface Question {
    id: string;
    type: string;
    text: string;
    label?: string; // Fallback
    required: boolean;
    hasLogic?: boolean;
    conditions?: Condition[];
    logicOperator?: "any" | "all";
    description?: string;
    placeholder?: string;
    options?: string[];
    maxFileSize?: string;
}

interface Section {
    id: string;
    title: string;
    description?: string;
    questions: Question[];
}

export default function ApplicationPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [applicantNameInput, setApplicantNameInput] = useState("");
    const [honeypot, setHoneypot] = useState("");
    const [formRenderedAt] = useState(() => new Date().toISOString());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const turnstileRef = React.useRef<HTMLDivElement>(null);
    const turnstileWidgetId = React.useRef<string | null>(null);

    // Load Turnstile script once
    useEffect(() => {
        const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
        if (!SITE_KEY) return;

        if (document.getElementById('cf-turnstile-script')) return;
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }, []);
    const [isSaved, setIsSaved] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: "" });
    const [program, setProgram] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());

    // Fetch program data on mount
    useEffect(() => {
        const fetchProgram = async () => {
            setLoading(true);
            try {
                // Fetch program and its form fields
                let { data, error } = await supabase
                    .from("programs")
                    .select("*, forms(fields, cover_image_url, thank_you_msg)")
                    .eq("id", slug)
                    .single();

                if (error || !data) {
                    // Try by slug field
                    const { data: slugData, error: slugError } = await supabase
                        .from("programs")
                        .select("*, forms(fields, cover_image_url, thank_you_msg)")
                        .eq("slug", slug)
                        .single();

                    if (slugError || !slugData) {
                        setProgram(null);
                    } else {
                        // Extract sections from form
                        const form = slugData.forms?.[0];
                        const fields = form?.fields || [];

                        // Normalize: if it's a flat list of questions, wrap in a default section
                        const sections = (Array.isArray(fields) && fields.length > 0 && !('questions' in fields[0]))
                            ? [{ id: 'default', title: 'Application', questions: fields }]
                            : fields;

                        setProgram({
                            ...slugData,
                            sections,
                            cover_image_url: form?.cover_image_url,
                            thank_you_msg: form?.thank_you_msg
                        });
                    }
                } else {
                    // Extract sections from form
                    const form = data.forms?.[0];
                    const fields = form?.fields || [];

                    // Normalize: if it's a flat list of questions, wrap in a default section
                    const sections = (Array.isArray(fields) && fields.length > 0 && !('questions' in fields[0]))
                        ? [{ id: 'default', title: 'Application', questions: fields }]
                        : fields;

                    setProgram({
                        ...data,
                        sections,
                        cover_image_url: form?.cover_image_url,
                        thank_you_msg: form?.thank_you_msg
                    });
                }
            } catch (err) {
                console.error("Error fetching program:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProgram();
    }, [slug]);

    // Load draft on mount
    useEffect(() => {
        const saved = localStorage.getItem(`draft_${slug}`);
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                setResponses(draft.responses || {});
                setApplicantNameInput(draft.applicantName || "");
            } catch (e) {
                console.error("Failed to load draft", e);
            }
        }
    }, [slug]);

    // Auto-save on response change
    useEffect(() => {
        if (Object.keys(responses).length > 0 || applicantNameInput) {
            localStorage.setItem(`draft_${slug}`, JSON.stringify({
                responses,
                applicantName: applicantNameInput
            }));
            setIsSaved(true);
            const timer = setTimeout(() => setIsSaved(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [responses, slug]);

    // Toast notification helper
    const showToast = (message: string) => {
        setToast({ visible: true, message });
        setTimeout(() => setToast({ visible: false, message: "" }), 3000);
    };

    const totalSections = program?.sections?.length || 0;


    if (loading) {
        return <FormSkeleton />;
    }

    // Gating Logic: Check if the application window is open
    const now = new Date();
    const openDate = program?.open_date ? new Date(program.open_date) : null;
    const deadline = program?.deadline ? new Date(program.deadline) : null;
    const isNotStarted = openDate && now < openDate;
    const isClosed = deadline && now > deadline;

    if (!program || !program.sections || program.sections.length === 0 || isNotStarted || isClosed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl shadow-blue-900/5 border border-gray-100 space-y-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                        {isNotStarted ? <Clock className="w-8 h-8" /> : <X className="w-8 h-8" />}
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-xl font-bold text-gray-900">
                            {!program ? "Program Not Found" :
                             isNotStarted ? "Applications Not Yet Open" :
                             isClosed ? "Applications Closed" : "Form Not Ready"}
                        </h1>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium">
                            {!program ? "The program you are looking for does not exist or has been removed." :
                             isNotStarted ? `This program will begin accepting applications on ${openDate?.toLocaleDateString()} at ${openDate?.toLocaleTimeString()}.` :
                             isClosed ? "The application deadline for this program has passed. We are no longer accepting new submissions." :
                             "This program doesn't have an application form set up yet."}
                        </p>
                    </div>
                    {program && (
                        <div className="pt-4 border-t border-gray-50">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Questions?</p>
                            <p className="text-xs font-bold text-blue-600 mt-1">{program.contact_email || "cohortlyapp@gmail.com"}</p>
                        </div>
                    )}
                    <Button 
                        variant="outline" 
                        className="w-full h-11 rounded-xl font-bold text-sm"
                        onClick={() => window.location.href = "/"}
                    >
                        Back to Home
                    </Button>
                </div>
            </div>
        );
    }

    const PROGRAM_DATA = {
        name: program.name || "Untitled Program",
        description: program.description || "No description provided.",
        logo: program.logo_url || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&auto=format&fit=crop&q=60",
        coverImage: program.cover_image_url || "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=60",
        thankYouMessage: program.thank_you_msg || "We've received your application and will review it soon.",
        contactEmail: program.contact_email || "cohortlyapp@gmail.com",
        nextSteps: program.next_steps || [
            { title: "Initial Review", description: "Our team will review your responses within 48 hours." },
            { title: "Shortlisting", description: "Selected candidates will be moved to the next phase." },
            { title: "Final Decision", description: "You will receive an update via your registered email." }
        ],
        allowAnotherResponse: program.allow_another_response ?? true,
        ...program
    };

    const handleJumpToSection = (index: number) => {
        if (index === currentSectionIndex) return;
        // Allow jumping if the section is already completed or it's the next available one
        if (index <= Math.max(-1, ...Array.from(completedSections)) + 1 || index < currentSectionIndex) {
            setCurrentSectionIndex(index);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const currentSection = PROGRAM_DATA.sections[currentSectionIndex];
    const progress = ((currentSectionIndex + 1) / totalSections) * 100;

    const evaluateCondition = (condition: Condition) => {
        const responseValue = responses[condition.questionId];
        if (!responseValue) return false;

        switch (condition.operator) {
            case "is":
                return responseValue === condition.value;
            case "is not":
            case "is-not":
                return responseValue !== condition.value;
            case "contains":
                return responseValue.toLowerCase().includes(condition.value.toLowerCase());
            case "does not contain":
            case "does-not-contain":
                return !responseValue.toLowerCase().includes(condition.value.toLowerCase());
            case "greater than":
            case "greater-than":
                return parseFloat(responseValue) > parseFloat(condition.value);
            case "less than":
            case "less-than":
                return parseFloat(responseValue) < parseFloat(condition.value);
            default:
                return true;
        }
    };

    const isQuestionVisible = (question: Question) => {
        if (!question.hasLogic || !question.conditions || question.conditions.length === 0) return true;

        const results = question.conditions.map(evaluateCondition);
        return question.logicOperator === "all"
            ? results.every(r => r)
            : results.some(r => r);
    };

    const validateSection = () => {
        const newErrors: Record<string, string> = {};
        
        // Validate Applicant Name if enabled and in first section
        if (currentSectionIndex === 0 && PROGRAM_DATA.collect_name && !applicantNameInput.trim()) {
            newErrors["applicantName"] = "Full name is required";
        }

        currentSection.questions?.forEach((q: Question) => {
            if (isQuestionVisible(q)) {
                if (q.required && !responses[q.id]) {
                    newErrors[q.id] = `${q.text || q.label || 'This field'} is required`;
                } else if (q.type === "email" && responses[q.id]) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(responses[q.id])) {
                        newErrors[q.id] = "Invalid email format";
                    }
                } else if (q.type === "phone" && responses[q.id]) {
                    const digits = responses[q.id].replace(/\D/g, '');
                    if (digits.length < 10 && digits.length > 0) {
                        newErrors[q.id] = "Invalid phone number format";
                    }
                }
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (!validateSection()) {
            showToast("Please fix the errors before continuing");
            return;
        }

        // Mark current section as completed
        setCompletedSections(prev => new Set([...Array.from(prev), currentSectionIndex]));

        if (currentSectionIndex < totalSections - 1) {
            setCurrentSectionIndex(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentSectionIndex > 0) {
            setCurrentSectionIndex(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleSave = () => {
        localStorage.setItem(`draft_${slug}`, JSON.stringify({
            responses,
            applicantName: applicantNameInput
        }));
        showToast("Draft saved successfully");
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        // Verify Turnstile CAPTCHA if configured
        if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
            if (!turnstileToken) {
                showToast("Please complete the verification challenge.");
                setIsSubmitting(false);
                return;
            }

            try {
                const verifyRes = await fetch('/api/turnstile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: turnstileToken }),
                });
                const verifyData = await verifyRes.json();
                if (!verifyData.success) {
                    showToast(verifyData.error || "Bot verification failed. Please try again.");
                    setIsSubmitting(false);
                    // Reset the widget
                    if ((window as any).turnstile && turnstileWidgetId.current) {
                        (window as any).turnstile.reset(turnstileWidgetId.current);
                    }
                    setTurnstileToken(null);
                    return;
                }
            } catch (err) {
                showToast("Verification service unavailable. Please try again.");
                setIsSubmitting(false);
                return;
            }
        }
        
        try {
            // 1. Identify key fields from responses (attempt to find name, email, company)
            // We can look for questions with specific types or text
            let applicantName = applicantNameInput || "Anonymous";
            let applicantEmail = "";
            let companyName = "N/A";

            // Loop through all sections/questions to find these
            PROGRAM_DATA.sections.forEach((section: Section) => {
                section.questions.forEach((q: Question) => {
                    const val = responses[q.id];
                    if (!val) return;

                    const text = q.text?.toLowerCase() || q.label?.toLowerCase() || "";
                    if (q.type === "email" || text.includes("email")) {
                        applicantEmail = val;
                    } else if (text.includes("full name") || text.includes("your name") || text === "name") {
                        applicantName = val;
                    } else if (text.includes("company") || text.includes("startup name")) {
                        companyName = val;
                    }
                });
            });

            // 2. Insert into Database
            const { data: newApp, error: insertError } = await supabase.rpc(
                "submit_application_secure",
                {
                    p_program_id: program.id,
                    p_applicant_email: applicantEmail,
                    p_applicant_name: applicantName,
                    p_company_name: companyName,
                    p_answers: responses,
                    p_submitted_at: new Date().toISOString(),
                    p_rendered_at: formRenderedAt,
                    p_honeypot: honeypot,
                }
            );

            if (insertError) throw insertError;

            // 3. Trigger Slack Notification
            try {
                await supabase.functions.invoke('notify-slack', {
                    body: {
                        message: `*${applicantName}* just applied to *${PROGRAM_DATA.name}*!`,
                        programName: PROGRAM_DATA.name,
                        applicationId: newApp.id,
                        programId: program.id,
                        emoji: '🚀'
                    }
                });
            } catch (slackErr) {
                console.error("Slack notification failed:", slackErr);
                // Don't fail the whole submission if just Slack fails
            }

            // 4. Success State
            localStorage.removeItem(`draft_${slug}`);
            setIsSubmitting(false);
            setIsSuccess(true);
            window.scrollTo({ top: 0, behavior: "smooth" });

        } catch (error: any) {
            console.error("Submission error:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            showToast("Failed to submit application: " + (error.message || "Unknown error"));
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <ScalingWrapper className="fixed inset-0 z-[200] bg-gradient-to-br from-blue-50 via-white to-blue-50/10 overflow-y-auto overflow-x-hidden flex flex-col items-center min-h-screen">
                <button
                    onClick={() => setIsSuccess(false)}
                    className="fixed top-8 right-8 p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-gray-900 transition-all shadow-sm hover:shadow-md z-[210]"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Confetti Container (Fixed, no scroll expansion) */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    {[...Array(40)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                top: "-10%",
                                left: `${(i * 137) % 100}%`,
                                rotate: 0,
                                scale: 0.5 + (i % 5) * 0.1
                            }}
                            animate={{
                                top: "110%",
                                rotate: 720,
                                left: `${((i * 137) % 100) + (i % 2 === 0 ? 10 : -10)}%`
                            }}
                            transition={{
                                duration: 3 + (i % 4),
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: (i % 10) * 0.8
                            }}
                            className={cn(
                                "absolute w-3 h-3 rounded-full opacity-40 blur-[1px]",
                                ["bg-blue-600", "bg-indigo-500", "bg-emerald-400", "bg-amber-400", "bg-pink-400"][i % 5]
                            )}
                        />
                    ))}
                </div>

                <div className="flex-1 w-full flex flex-col items-center justify-center p-6 sm:p-12 relative z-10 py-24 min-h-screen">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="max-w-2xl w-full bg-white rounded-2xl p-8 md:p-12 shadow-xl border border-gray-100 text-center space-y-8 my-auto"
                    >
                        {/* Success Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto"
                        >
                            <CheckCircle2 className="w-10 h-10" />
                        </motion.div>

                        {/* Headline and Message */}
                        <div className="space-y-3">
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                Application Submitted
                            </h1>
                            <p className="text-gray-500 text-sm font-medium max-w-md mx-auto leading-relaxed">
                                {PROGRAM_DATA.thankYouMessage}
                            </p>
                        </div>

                        {/* Next Steps Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left py-6">
                            {PROGRAM_DATA.nextSteps.map((step: any, idx: number) => (
                                <div key={idx} className="space-y-2 p-4 rounded-xl bg-gray-50/50 border border-gray-100/50">
                                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">{idx + 1}</span>
                                        {step.title}
                                    </h3>
                                    <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{step.description}</p>
                                </div>
                            ))}
                        </div>

                        {/* Footer Info: Socials & Contact */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                </div>
                                <span className="text-xs font-bold text-gray-600">{PROGRAM_DATA.contactEmail}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg border-gray-100">
                                    <Twitter className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg border-gray-100">
                                    <Linkedin className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Final Actions */}
                        <div className="pt-4 space-y-4">
                            <Button
                                className="w-full h-12 bg-black hover:bg-gray-800 text-white rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all"
                                onClick={() => window.location.reload()}
                            >
                                Done
                            </Button>

                            {PROGRAM_DATA.allowAnotherResponse && (
                                <button
                                    onClick={() => {
                                        setResponses({});
                                        setIsSuccess(false);
                                        setCurrentSectionIndex(0);
                                        setCompletedSections(new Set());
                                    }}
                                    className="text-gray-400 text-xs font-bold hover:text-gray-900 transition-colors flex items-center gap-2 mx-auto"
                                >
                                    Submit another response
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </ScalingWrapper>
        );
    }

    return (
        <ScalingWrapper className="min-h-screen bg-[#F8FAFC] pb-32">
            {/* 1. Fixed Top Progress Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="h-1.5 w-full bg-gray-100 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    />
                </div>
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-blue-600">{Math.round(progress)}%</span>
                            <div className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="text-sm font-bold text-gray-900 truncate hidden sm:inline">Section {currentSectionIndex + 1} — {currentSection.title}</span>
                        </div>

                        {/* Interactive Dots */}
                        <div className="flex items-center gap-2">
                            {PROGRAM_DATA.sections.map((section: Section, idx: number) => {
                                const isCompleted = completedSections.has(idx);
                                const isCurrent = idx === currentSectionIndex;
                                const canJump = idx <= Math.max(-1, ...Array.from(completedSections)) + 1 || idx < currentSectionIndex;

                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => handleJumpToSection(idx)}
                                        disabled={!canJump}
                                        className={cn(
                                            "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                            isCurrent ? "bg-blue-600 scale-125 ring-4 ring-blue-100" :
                                                isCompleted ? "bg-blue-400" : "bg-gray-200",
                                            canJump ? "cursor-pointer hover:bg-blue-300" : "cursor-not-allowed opacity-50"
                                        )}
                                        title={section.title}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSave}
                        className="text-gray-500 hover:text-blue-600 font-bold gap-2 rounded-xl"
                    >
                        <Save className="w-4 h-4" />
                        <span className="hidden xs:inline">Save Draft</span>
                    </Button>
                </div>
            </div>

            {/* 2. Hero Header */}
            <div className="relative h-[300px] w-full overflow-hidden">
                <img
                    src={PROGRAM_DATA.coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#F8FAFC]" />
            </div>

            <div className="max-w-3xl mx-auto px-6 -mt-32 relative z-10">
                <div className="bg-white rounded-2xl p-6 md:p-10 shadow-xl shadow-blue-900/5 space-y-6 border border-gray-100">
                    <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
                        <label htmlFor="website">Website</label>
                        <input
                            id="website"
                            name="website"
                            tabIndex={-1}
                            autoComplete="off"
                            value={honeypot}
                            onChange={(e) => setHoneypot(e.target.value)}
                        />
                    </div>
                    {/* Header Info */}
                    <div className="flex flex-col items-center text-center space-y-4 pb-6 border-b border-gray-100">
                        <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg -mt-16 border border-gray-100 overflow-hidden">
                            <img src={PROGRAM_DATA.logo} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{PROGRAM_DATA.name}</h1>
                            <p className="text-gray-600 text-sm leading-relaxed max-w-lg">
                                {PROGRAM_DATA.description}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                                <Clock className="w-3.5 h-3.5" />
                                10 min
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                                <Shield className="w-3.5 h-3.5" />
                                Verified
                            </div>
                        </div>
                    </div>

                    {/* 3. Form Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSection.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-gray-900">{currentSection.title}</h2>
                                {currentSection.description && <p className="text-sm text-gray-500">{currentSection.description}</p>}
                            </div>

                            <div className="space-y-6 pl-4 border-l-2 border-gray-100">
                                {/* Auto-injected Full Name Field */}
                                {currentSectionIndex === 0 && PROGRAM_DATA.collect_name && (
                                    <motion.div
                                        className="space-y-2.5 pb-6 border-b border-gray-50 mb-6"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 leading-none">
                                                Full Name
                                                <span className="text-red-500">*</span>
                                            </label>
                                            {errors["applicantName"] && (
                                                <span className="text-[10px] font-bold text-red-500 animate-pulse">{errors["applicantName"]}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 leading-tight">We'll use this to identify your application.</p>
                                        <div className="mt-1">
                                            <Input
                                                type="text"
                                                placeholder="Enter your full name"
                                                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400"
                                                value={applicantNameInput}
                                                onChange={(e) => setApplicantNameInput(e.target.value)}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {currentSection.questions?.map((q: Question) => {
                                    if (!isQuestionVisible(q)) return null;

                                    const commonInputClasses = "w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400";
                                    const value = responses[q.id] || "";

                                    return (
                                        <motion.div
                                            key={q.id}
                                            className="space-y-2.5"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 leading-none">
                                                    {q.text || q.label}
                                                    {q.required && <span className="text-red-500">*</span>}
                                                </label>
                                                {errors[q.id] && (
                                                    <span className="text-[10px] font-bold text-red-500 animate-pulse">{errors[q.id]}</span>
                                                )}
                                            </div>
                                            {q.description && <p className="text-xs text-gray-500 leading-tight">{q.description}</p>}

                                            <div className="mt-1">
                                                {/* Text, Email, Location, etc. */}
                                                {(["short-text", "text", "email", "location"].includes(q.type)) && (
                                                    <div className="relative">
                                                        {q.type === "location" && <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />}
                                                        <Input
                                                            type={q.type === "email" ? "email" : "text"}
                                                            placeholder={q.placeholder || "Your answer..."}
                                                            className={cn(commonInputClasses, q.type === "location" && "pl-10")}
                                                            value={value}
                                                            onChange={(e) => {
                                                                setResponses({ ...responses, [q.id]: e.target.value });
                                                                if (errors[q.id]) setErrors({ ...errors, [q.id]: "" });
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Team Invites / References */}
                                                {(["references", "team-invites"].includes(q.type)) && (
                                                    <div className="space-y-3">
                                                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 hover:bg-white transition-all focus-within:ring-4 focus-within:ring-blue-600/5 focus-within:border-blue-600">
                                                            <div className="flex items-center gap-3 mb-2 text-sm font-semibold text-gray-700">
                                                                {q.type === "team-invites" ? <UserPlus className="w-4 h-4 text-blue-600" /> : <LinkIcon className="w-4 h-4 text-blue-600" />}
                                                                {q.type === "team-invites" ? "Collaborator Email Addresses" : "Reference Contact Information"}
                                                            </div>
                                                            <Textarea
                                                                placeholder={q.type === "team-invites" ? "Enter email addresses separated by commas..." : "Enter names, emails, and phone numbers of your references..."}
                                                                className="min-h-[80px] w-full text-sm resize-none bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-gray-400 shadow-none"
                                                                value={value}
                                                                onChange={(e) => {
                                                                    setResponses({ ...responses, [q.id]: e.target.value });
                                                                    if (errors[q.id]) setErrors({ ...errors, [q.id]: "" });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Phone Number */}
                                                {q.type === "phone" && (
                                                    <PhoneInput
                                                        value={value}
                                                        onChange={(val) => {
                                                            setResponses({ ...responses, [q.id]: val });
                                                            if (errors[q.id]) setErrors({ ...errors, [q.id]: "" });
                                                        }}
                                                    />
                                                )}

                                                {/* Funding / Revenue */}
                                                {(q.type === "funding-raised" || q.type === "revenue") && (
                                                    <CurrencyInput
                                                        value={value}
                                                        onChange={(val) => {
                                                            setResponses({ ...responses, [q.id]: val });
                                                            if (errors[q.id]) setErrors({ ...errors, [q.id]: "" });
                                                        }}
                                                    />
                                                )}

                                                {/* Diversity / DEI */}
                                                {q.type === "diversity" && (
                                                    <DiversityInput
                                                        value={value}
                                                        onChange={(val) => {
                                                            setResponses({ ...responses, [q.id]: val });
                                                            if (errors[q.id]) setErrors({ ...errors, [q.id]: "" });
                                                        }}
                                                    />
                                                )}

                                                {/* Long Text / Statement / Traction fallback */}
                                                {(q.type === "long-text" || q.type === "statement" || q.type === "traction") && (
                                                    <Textarea
                                                        placeholder={q.placeholder || (q.type === "traction" ? "Describe your current traction..." : "Type your answer here...")}
                                                        className={cn(commonInputClasses, "min-h-[120px] resize-none py-3")}
                                                        value={value}
                                                        onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}
                                                    />
                                                )}

                                                {/* Date Picker */}
                                                {q.type === "date" && (
                                                    <Input
                                                        type="date"
                                                        className={commonInputClasses}
                                                        value={value}
                                                        onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}
                                                    />
                                                )}

                                                {/* Multiple Choice / Checkboxes */}
                                                {(q.type === "multiple-choice" || q.type === "checkboxes") && (
                                                    <div className="space-y-2">
                                                        {q.options?.map((option: string) => {
                                                            const isSelected = q.type === "multiple-choice"
                                                                ? value === option
                                                                : (value || "").split(",").filter(Boolean).includes(option);

                                                            return (
                                                                <button
                                                                    key={option}
                                                                    onClick={() => {
                                                                        if (q.type === "multiple-choice") {
                                                                            setResponses({ ...responses, [q.id]: option });
                                                                        } else {
                                                                            const current = (value || "").split(",").filter(Boolean);
                                                                            const next = isSelected
                                                                                ? current.filter((o: string) => o !== option)
                                                                                : [...current, option];
                                                                            setResponses({ ...responses, [q.id]: next.join(",") });
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        "flex items-center justify-between w-full h-11 px-4 rounded-xl border-2 text-sm font-semibold transition-all",
                                                                        isSelected
                                                                            ? "border-blue-600 bg-blue-50 text-blue-700"
                                                                            : "border-gray-50 bg-gray-50/50 text-gray-500 hover:border-gray-200"
                                                                    )}
                                                                >
                                                                    {option}
                                                                    <div className={cn(
                                                                        "w-4 h-4 flex items-center justify-center transition-all",
                                                                        q.type === "multiple-choice" ? "rounded-full border-2" : "rounded-md border-2",
                                                                        isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                                                                    )}>
                                                                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Dropdown */}
                                                {q.type === "dropdown" && (
                                                    <select
                                                        className={cn(commonInputClasses, "appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]")}
                                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                                        value={value}
                                                        onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}
                                                    >
                                                        <option value="">Select an option...</option>
                                                        {q.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                )}

                                                {/* Media Uploads */}
                                                {(["file-upload", "file", "image-upload", "video-pitch", "video"].includes(q.type)) && (
                                                    <label className="block border-2 border-dashed border-gray-100 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer bg-gray-50/50 group">
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept={q.type === 'video-pitch' || q.type === 'video' ? 'video/*' : q.type === 'image-upload' ? 'image/*' : '*/*'}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    setResponses({ ...responses, [q.id]: file.name });
                                                                    if (errors[q.id]) setErrors({ ...errors, [q.id]: "" });
                                                                }
                                                            }}
                                                        />
                                                        {value ? (
                                                            <div className="flex flex-col items-center justify-center">
                                                                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                                                                <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{value}</p>
                                                                <p className="text-xs text-blue-600 mt-1">Click to change file</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                                                                <p className="text-xs font-semibold text-gray-700">
                                                                    {q.type === "video-pitch" ? "Record or upload video" : "Click to upload or drag and drop"}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-1">
                                                                    {q.maxFileSize ? `Max size: ${q.maxFileSize}MB` : "Maximum: 10MB"}
                                                                </p>
                                                            </>
                                                        )}
                                                    </label>
                                                )}

                                                {/* Fallback for unknown types */}
                                                {!["short-text", "text", "email", "phone", "funding-raised", "revenue", "location", "references", "diversity", "team-invites", "long-text", "statement", "traction", "date", "multiple-choice", "checkboxes", "dropdown", "file-upload", "file", "image-upload", "video-pitch", "video"].includes(q.type) && (
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder={q.placeholder || "Your answer..."}
                                                            className={commonInputClasses}
                                                            value={value}
                                                            onChange={(e) => {
                                                                setResponses({ ...responses, [q.id]: e.target.value });
                                                                if (errors[q.id]) setErrors({ ...errors, [q.id]: "" });
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Turnstile CAPTCHA Widget — renders on the final section */}
                            {currentSectionIndex === totalSections - 1 && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pt-8 border-t border-gray-100 flex flex-col items-center gap-4"
                                >
                                    <div className="text-center space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verification Required</p>
                                        <p className="text-xs text-gray-500 font-medium">Please complete the challenge below to submit.</p>
                                    </div>
                                    <TurnstileWidget 
                                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} 
                                        turnstileRef={turnstileRef}
                                        setTurnstileToken={setTurnstileToken}
                                    />
                                </motion.div>
                            )}
                        </motion.div>

                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation Buttons Row */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-gray-100 py-4 px-6">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentSectionIndex === 0}
                        className="h-11 px-6 rounded-xl font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-0 transition-all text-xs"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1.5" />
                        Previous
                    </Button>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={handleSave}
                            className="hidden sm:flex h-11 px-6 rounded-xl font-bold border-gray-100 hover:border-gray-200 text-xs transition-all"
                        >
                            Save Draft
                        </Button>
                        <Button
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className="h-11 px-8 rounded-xl bg-black hover:bg-gray-800 text-white font-bold text-xs shadow-sm shadow-gray-200 transition-all flex items-center gap-2 active:scale-95"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    {currentSectionIndex === totalSections - 1 ? "Submit Application" : "Next Section"}
                                    <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 20, x: "-50%" }}
                        className="fixed bottom-28 left-1/2 z-[100] px-6 py-3 bg-gray-900 text-white rounded-full shadow-2xl flex items-center gap-3 border border-gray-800"
                    >
                        <CheckCircle2 className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-medium">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </ScalingWrapper>
    );
}

// --- Stable Turnstile Widget Component ---
const TurnstileWidget = ({ 
    siteKey, 
    turnstileRef, 
    setTurnstileToken 
}: { 
    siteKey: string;
    turnstileRef: React.RefObject<HTMLDivElement | null>;
    setTurnstileToken: (token: string | null) => void;
}) => {
    useEffect(() => {
        let widgetId: string | null = null;
        let interval: NodeJS.Timeout;

        const render = () => {
            if (turnstileRef.current && (window as any).turnstile && !widgetId) {
                try {
                    widgetId = (window as any).turnstile.render(turnstileRef.current, {
                        sitekey: siteKey,
                        callback: (token: string) => setTurnstileToken(token),
                        'expired-callback': () => setTurnstileToken(null),
                        theme: 'light',
                    });
                    if (interval) clearInterval(interval);
                } catch (e) {
                    console.warn("Turnstile render error:", e);
                }
            }
        };

        // Try immediately
        render();
        // Poll because the script or the DOM element might not be ready in the first tick
        interval = setInterval(render, 500);

        return () => {
            if (interval) clearInterval(interval);
            if (widgetId && (window as any).turnstile) {
                try {
                    (window as any).turnstile.remove(widgetId);
                } catch (e) { /* ignore */ }
            }
            setTurnstileToken(null);
        };
    }, [siteKey, turnstileRef, setTurnstileToken]);

    return <div ref={turnstileRef} className="cf-turnstile min-h-[65px]" />;
};
