import { SupabaseClient } from "@supabase/supabase-js";

export interface MigrationPayload {
    version: number;
    export_date: string;
    program: any;
    rubrics: any[];
    threshold_rules: any[];
    form: any;
    applications: any[];
}

/**
 * Generates a full snapshot of a cohort and downloads it as a JSON file.
 */
export async function exportCohortToJSON(

    programId: string,
    supabaseClient: SupabaseClient
): Promise<void> {
    // 1. Fetch all data
    const { data: program, error: progErr } = await supabaseClient
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();
    if (progErr) throw new Error("Failed to fetch program");

    const { data: rubrics } = await supabaseClient.from('rubrics').select('*').eq('program_id', programId);
    const { data: thresholdRules } = await supabaseClient.from('threshold_rules').select('*').eq('program_id', programId);
    const { data: form } = await supabaseClient.from('forms').select('*').eq('program_id', programId).maybeSingle();
    const { data: applications } = await supabaseClient.from('applications').select('*').eq('program_id', programId);

    // 2. Build payload (strip IDs from program so it can be cleanly imported elsewhere)
    const payload: MigrationPayload = {
        version: 1,
        export_date: new Date().toISOString(),
        program,
        rubrics: rubrics || [],
        threshold_rules: thresholdRules || [],
        form: form || null,
        applications: applications || [],
    };

    // 3. Trigger download
    const filename = `${program.slug || program.name}-cohort-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Parses and validates a JSON snapshot file.
 */
export async function parseMigrationFile(file: File): Promise<MigrationPayload> {
    const text = await file.text();
    let payload;
    try {
        payload = JSON.parse(text);
    } catch {
        throw new Error("Invalid format. Please upload a valid JSON file.");
    }

    if (!payload.version || !payload.program) {
        throw new Error("Invalid migration snapshot. Missing required cohort data.");
    }

    return payload as MigrationPayload;
}

/**
 * Imports a cohort snapshot into the database, mapping new IDs appropriately.
 */
export async function importCohortFromSnapshot(
    payload: MigrationPayload,
    userId: string,
    supabaseClient: SupabaseClient
): Promise<{ programId: string; applicantCount: number }> {

    // 1. Insert new program
    // Strip original ID and timeline dates to prevent conflict, assign to current user
    const { id: oldProgramId, created_at, updated_at, ...programData } = payload.program;
    const { data: newProgram, error: progErr } = await supabaseClient
        .from('programs')
        .insert({
            ...programData,
            user_id: userId,
            name: `${programData.name} (Imported)`,
            slug: `${programData.slug || "program"}-imported-${Math.random().toString(36).substring(2, 8)}`,
        })
        .select('id')
        .single();

    if (progErr) throw new Error(`Failed to create program: ${progErr.message}`);
    const newProgramId = newProgram.id;

    // 2. Insert Form
    if (payload.form) {
        const { id, program_id, created_at, updated_at, ...formData } = payload.form;
        await supabaseClient.from('forms').insert({
            ...formData,
            program_id: newProgramId
        });
    }

    // 3. Insert Threshold Rules
    if (payload.threshold_rules && payload.threshold_rules.length > 0) {
        const rulesToInsert = payload.threshold_rules.map(r => {
            const { id, program_id, created_at, ...ruleData } = r;
            return { ...ruleData, program_id: newProgramId };
        });
        await supabaseClient.from('threshold_rules').insert(rulesToInsert);
    }

    // 4. Insert Rubrics and Map IDs
    const rubricMap = new Map<string, string>(); // old_id -> new_id
    if (payload.rubrics && payload.rubrics.length > 0) {
        // Since we need to map old IDs to new IDs, we insert them and fetch the generated IDs
        for (const oldRubric of payload.rubrics) {
            const { id: oldId, program_id, created_at, ...rubricData } = oldRubric;
            const { data: newlyInserted } = await supabaseClient
                .from('rubrics')
                .insert({ ...rubricData, program_id: newProgramId })
                .select('id')
                .single();

            if (newlyInserted) {
                rubricMap.set(oldId, newlyInserted.id);
            }
        }
    }

    // 5. Insert Applications with re-mapped Rubric Scores
    let applicantCount = 0;
    if (payload.applications && payload.applications.length > 0) {
        const appsToInsert = payload.applications.map(app => {
            const { id, program_id, created_at, updated_at, scores, ...appData } = app;

            // Remap keys in the scores JSON object
            let mappedScores: Record<string, any> = {};
            if (scores && typeof scores === 'object') {
                for (const [oldCriterionId, val] of Object.entries(scores)) {
                    const newCriterionId = rubricMap.get(oldCriterionId);
                    if (newCriterionId) {
                        mappedScores[newCriterionId] = val;
                    } else {
                        // If mapping fails, keep old just in case or skip
                        mappedScores[oldCriterionId] = val;
                    }
                }
            }

            return {
                ...appData,
                program_id: newProgramId,
                scores: mappedScores
            };
        });

        // Insert in batches of 50
        const BATCH_SIZE = 50;
        for (let i = 0; i < appsToInsert.length; i += BATCH_SIZE) {
            const batch = appsToInsert.slice(i, i + BATCH_SIZE);
            const { error: batchErr } = await supabaseClient.from('applications').insert(batch);
            if (batchErr) {
                console.error("Batch insert error:", batchErr);
            } else {
                applicantCount += batch.length;
            }
        }
    }

    return { programId: newProgramId, applicantCount };
}
