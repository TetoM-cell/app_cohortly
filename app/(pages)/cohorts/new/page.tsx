"use client";

import React, { useState, useEffect } from "react";
import { WizardProgress } from "./components/wizard-progress";
import { CohortBasics } from "./components/cohort-basics";
import { FormBuilder, getIconForType, Section } from "./components/form-builder";
import { RubricScoring } from "./components/rubric-scoring";
import { SettingsLaunch } from "./components/settings-launch";
import { WizardSkeleton } from "./components/wizard-skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ScalingWrapper } from "@/components/scaling-wrapper";
import { Suspense } from "react";

const STEPS = [
    { id: 1, title: "Cohort Basics" },
    { id: 2, title: "Form Builder" },
    { id: 3, title: "Rubric & AI Scoring" },
    { id: 4, title: "Settings & Launch" },
];

interface Criterion {
    id: string;
    name: string;
    weight: number;
    description: string;
}

function NewCohortPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [programId, setProgramId] = useState<string | null>(null);

    // 1. Basics State
    const [cohortData, setCohortData] = useState<{
        name: string;
        description: string;
        type: string;
        openDate: Date | undefined;
        deadline: Date | undefined;
        expectedApps: string;
        collectName: boolean;
        contactEmail: string;
    }>({
        name: "",
        description: "",
        type: "",
        openDate: undefined,
        deadline: undefined,
        expectedApps: "",
        collectName: false,
        contactEmail: "",
    });

    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [logo, setLogo] = useState<string | null>(null);

    // 2. Form State
    const [sections, setSections] = useState<Section[]>([]);

    // 3. Rubric State
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [thresholds, setThresholds] = useState({
        shortlist: 85,
        reject: 55,
        enabled: true
    });
    const [reviewers, setReviewers] = useState<{ email: string; role: string; status: string }[]>([]);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();
    }, []);

    useEffect(() => {
        if (!editId) return;

        const loadDraft = async () => {
            setLoading(true);
            try {
                // 1. Load Program
                const { data: program, error: progError } = await supabase
                    .from('programs')
                    .select('*')
                    .eq('id', editId)
                    .single();

                if (progError) throw progError;

                setProgramId(program.id);
                setCohortData({
                    name: program.name,
                    description: program.description || "",
                    type: program.type || "",
                    openDate: program.open_date ? new Date(program.open_date) : undefined,
                    deadline: program.deadline ? new Date(program.deadline) : undefined,
                    expectedApps: "",
                    collectName: program.collect_name || false,
                    contactEmail: program.contact_email || "",
                });

                // 2. Load Form
                const { data: form } = await supabase
                    .from('forms')
                    .select('*')
                    .eq('program_id', editId)
                    .single();

                if (form) {
                    setCoverImage(form.cover_image_url || null);
                    if (form.fields) {
                        const hydratedSections = (form.fields as Section[]).map(section => ({
                            ...section,
                            questions: section.questions.map(q => ({
                                ...q,
                                icon: getIconForType(q.type)
                            }))
                        }));
                        setSections(hydratedSections);
                    }
                }

                // Load Logo from program
                setLogo(program.logo_url || null);

                // 3. Load Rubrics
                const { data: rubrics } = await supabase
                    .from('rubrics')
                    .select('*')
                    .eq('program_id', editId);

                if (rubrics) {
                    setCriteria(rubrics.map((r: any) => ({
                        id: r.id,
                        name: r.name,
                        weight: r.weight,
                        description: r.description
                    })));
                }

                // 4. Load Thresholds
                const { data: rules } = await supabase
                    .from('threshold_rules')
                    .select('*')
                    .eq('program_id', editId);

                if (rules && rules.length > 0) {
                    const shortlistRule = rules.find((r: any) => r.action === 'shortlist' || r.action === 'accept');
                    const rejectRule = rules.find((r: any) => r.action === 'reject');
                    setThresholds({
                        enabled: true,
                        shortlist: shortlistRule ? shortlistRule.value : 85,
                        reject: rejectRule ? rejectRule.value : 55
                    });
                }

                // 5. Load Reviewers
                const { data: revs } = await supabase
                    .from('program_reviewers')
                    .select('role, profiles(email)')
                    .eq('program_id', editId);

                if (revs) {
                    setReviewers(revs.map((r: any) => ({
                        email: r.profiles?.email || '',
                        role: r.role.charAt(0).toUpperCase() + r.role.slice(1),
                        status: 'Sent'
                    })).filter(r => r.email));
                }

                toast.success("Draft loaded");
            } catch (error) {
                console.error("Error loading draft:", error);
                toast.error("Failed to load draft");
            } finally {
                setLoading(false);
            }
        };

        loadDraft();
    }, [editId]);

    const handleNext = async () => {
        if (currentStep < STEPS.length) {
            // Quietly save draft when moving forward
            try {
                await handleSaveDraft();
                setCurrentStep((prev) => prev + 1);
            } catch (e) {
                console.error("Failed to auto-save draft:", e);
                return;
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const saveProgram = async (status: 'draft' | 'published') => {
        if (!user) {
            toast.error("You must be logged in to create a program.");
            return;
        }

        setLoading(true);
        try {
            let currentProgramId = programId;

            // 0. Ensure a profile row exists for this user (prevents FK violation on programs.owner_id)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert(
                    {
                        id: user.id,
                        email: user.email,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'id', ignoreDuplicates: true }
                );

            if (profileError) {
                console.error('Profile upsert error:', profileError);
                // Non-fatal: the row may already exist and RLS may block the upsert; continue anyway.
            }

            // 1. Create/Update Program
            if (!currentProgramId) {
                // Generate slug and truncate to 50 chars (DB limit)
                let slug = (cohortData.name || 'untitled').toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

                // Truncate to leave room for the random suffix (6 chars including dash)
                slug = slug.substring(0, 43) + '-' + Math.random().toString(36).substring(2, 7);

                const { data: program, error: progError } = await supabase
                    .from('programs')
                    .insert({
                        owner_id: user.id,
                        name: (cohortData.name || 'Untitled Cohort').substring(0, 100),
                        slug: slug,
                        description: cohortData.description?.substring(0, 255),
                        type: cohortData.type?.substring(0, 50),
                        open_date: cohortData.openDate?.toISOString(),
                        deadline: cohortData.deadline?.toISOString(),
                        logo_url: logo,
                        status: status,
                        collect_name: cohortData.collectName,
                        contact_email: cohortData.contactEmail
                    })
                    .select()
                    .single();

                if (progError) {
                    console.error('Program creation error (Full):', JSON.stringify(progError, null, 2));
                    console.error('Program creation error (Details):', progError.message, progError.details, progError.hint);
                    throw progError;
                }
                currentProgramId = program.id;
                setProgramId(program.id);
            } else {
                const { error: progError } = await supabase
                    .from('programs')
                    .update({
                        name: cohortData.name?.substring(0, 100),
                        description: cohortData.description?.substring(0, 255),
                        type: cohortData.type?.substring(0, 50),
                        open_date: cohortData.openDate?.toISOString(),
                        deadline: cohortData.deadline?.toISOString(),
                        logo_url: logo,
                        status: status,
                        collect_name: cohortData.collectName,
                        contact_email: cohortData.contactEmail,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentProgramId);

                if (progError) {
                    console.error('Program update error (Full):', JSON.stringify(progError, null, 2));
                    console.error('Program update error (Details):', progError.message, progError.details, progError.hint);
                    throw progError;
                }
            }

            // 2. Create/Update Form
            const { data: existingForm, error: fetchFormError } = await supabase
                .from('forms')
                .select('id')
                .eq('program_id', currentProgramId)
                .maybeSingle();

            if (fetchFormError) {
                console.error('Fetch form error (Full):', JSON.stringify(fetchFormError, null, 2));
                throw fetchFormError;
            }

            if (existingForm) {
                const { error: formError } = await supabase
                    .from('forms')
                    .update({
                        title: `${cohortData.name || 'Untitled'} Application Form`.substring(0, 100),
                        fields: sections,
                        cover_image_url: coverImage
                    })
                    .eq('id', existingForm.id);
                if (formError) {
                    console.error('Form update error (Full):', JSON.stringify(formError, null, 2));
                    throw formError;
                }
            } else {
                const { error: formError } = await supabase
                    .from('forms')
                    .insert({
                        program_id: currentProgramId,
                        title: `${cohortData.name || 'Untitled'} Application Form`.substring(0, 100),
                        fields: sections,
                        cover_image_url: coverImage
                    });
                if (formError) {
                    console.error('Form creation error (Full):', JSON.stringify(formError, null, 2));
                    throw formError;
                }
            }

            // 3. Create/Update Rubrics
            await supabase
                .from('rubrics')
                .delete()
                .eq('program_id', currentProgramId);

            const rubricInserts = criteria.map(c => ({
                program_id: currentProgramId,
                name: c.name?.substring(0, 100),
                weight: c.weight,
                description: c.description?.substring(0, 255)
            }));

            if (rubricInserts.length > 0) {
                const { error: rubricError } = await supabase
                    .from('rubrics')
                    .insert(rubricInserts);
                if (rubricError) {
                    console.error('Rubric creation error (Full):', JSON.stringify(rubricError, null, 2));
                    throw rubricError;
                }
            }

            // 4. Create/Update Threshold Rules
            await supabase
                .from('threshold_rules')
                .delete()
                .eq('program_id', currentProgramId);

            if (thresholds.enabled) {
                // Auto-accept intentionally disabled to prevent irreversible decisions without human review
                const { error: thresholdError } = await supabase
                    .from('threshold_rules')
                    .insert([
                        { program_id: currentProgramId, target: 'overall_ai_score', operator: '>=', value: thresholds.shortlist, action: 'shortlist' },
                        { program_id: currentProgramId, target: 'overall_ai_score', operator: '<', value: thresholds.reject, action: 'reject' }
                    ]);
                if (thresholdError) {
                    console.error('Threshold rules error (Full):', JSON.stringify(thresholdError, null, 2));
                    throw thresholdError;
                }
            }

            // 5. Create/Update Reviewers
            // Fetch all profile IDs for the emails
            if (reviewers.length > 0) {
                const emails = reviewers.map(r => r.email);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .in('email', emails);

                if (profiles) {
                    const reviewerInserts = reviewers.map(r => {
                        const profile = profiles.find(p => p.email === r.email);
                        if (!profile) return null;

                        // Map UI roles to DB enum values: 'admin', 'reviewer', 'viewer'
                        let dbRole: 'admin' | 'reviewer' | 'viewer' = 'reviewer';
                        if (r.role === 'Admin') dbRole = 'admin';
                        if (r.role === 'View-only') dbRole = 'viewer';

                        return {
                            program_id: currentProgramId,
                            user_id: profile.id,
                            role: dbRole
                        };
                    }).filter(Boolean);

                    if (reviewerInserts.length > 0) {
                        // Delete existing to sync
                        await supabase.from('program_reviewers').delete().eq('program_id', currentProgramId);
                        const { error: revError } = await supabase.from('program_reviewers').insert(reviewerInserts);
                        if (revError) console.error("Reviewer save error:", revError);
                    }
                }
            }

            return currentProgramId;
        } catch (error: any) {
            console.error('Final save error catch (Full):', JSON.stringify(error, null, 2));
            const errorMessage = error.message || error.details || (typeof error === 'string' ? error : 'Check console for details');
            toast.error(`Error: ${errorMessage}`);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleLaunch = async () => {
        try {
            const id = await saveProgram('published');
            if (id) {
                toast.success("Cohort launched successfully!");
                router.push(`/dashboard?id=${id}`);
            }
        } catch (e) {
            // Error already handled in saveProgram
        }
    };

    const handleSaveDraft = async () => {
        await saveProgram('draft');
    };

    if (loading && editId) {
        return <WizardSkeleton />;
    }

    return (
        <ScalingWrapper className="min-h-screen bg-[#FBFCFD]">
            {currentStep === 1 && (
                <div className="p-8 md:p-12 lg:p-16 flex flex-col items-center">
                    <div className="w-full max-w-4xl">
                        <WizardProgress currentStep={currentStep} steps={STEPS} />
                        <div className="mt-16">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <CohortBasics
                                        formData={cohortData}
                                        setFormData={setCohortData}
                                        onNext={handleNext}
                                        onSave={handleSaveDraft}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 2 && (
                <AnimatePresence mode="wait">
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="h-screen"
                    >
                        <FormBuilder
                            onNext={handleNext}
                            onBack={handleBack}
                            onSave={handleSaveDraft}
                            steps={STEPS}
                            currentStep={currentStep}
                            sections={sections}
                            setSections={setSections}
                            coverImage={coverImage}
                            setCoverImage={setCoverImage}
                            logo={logo}
                            setLogo={setLogo}
                            cohortData={cohortData}
                            setCohortData={setCohortData}
                        />
                    </motion.div>
                </AnimatePresence>
            )}

            {currentStep === 3 && (
                <AnimatePresence mode="wait">
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <RubricScoring
                            onNext={handleNext}
                            onBack={handleBack}
                            onSave={handleSaveDraft}
                            programType={cohortData.type}
                            steps={STEPS}
                            currentStep={currentStep}
                            criteria={criteria}
                            setCriteria={setCriteria}
                            thresholds={thresholds}
                            setThresholds={setThresholds}
                        />
                    </motion.div>
                </AnimatePresence>
            )}

            {currentStep === 4 && (
                <AnimatePresence mode="wait">
                    <motion.div
                        key="step4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <SettingsLaunch
                            onNext={handleLaunch}
                            onBack={handleBack}
                            onSave={handleSaveDraft}
                            cohortName={cohortData.name}
                            steps={STEPS}
                            currentStep={currentStep}
                            loading={loading}
                            reviewers={reviewers}
                            setReviewers={setReviewers}
                            programId={programId}
                            cohortData={cohortData}
                            setCohortData={setCohortData}
                        />
                    </motion.div>
                </AnimatePresence>
            )}
        </ScalingWrapper>
    );
}

export default function NewCohortPage() {
    return (
        <Suspense fallback={<WizardSkeleton />}>
            <NewCohortPageContent />
        </Suspense>
    );
}
