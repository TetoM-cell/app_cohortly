import { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DuplicateMode = "skip" | "overwrite";

export interface ParsedRow {
    name: string;
    email: string;
    company: string;
    status: string;
    submitted_at: string;
    answers: Record<string, string>;
    /** Original row index (1-based, excluding header) */
    rowIndex: number;
}

export interface ImportError {
    rowIndex: number;
    message: string;
    raw?: string;
}

export interface ParseResult {
    rows: ParsedRow[];
    errors: ImportError[];
}

export interface ImportResult {
    inserted: number;
    skipped: number;
    errors: ImportError[];
}

// ─── Known column aliases ──────────────────────────────────────────────────────

const NAME_ALIASES = ["name", "full name", "full_name", "applicant", "applicant name", "applicant_name"];
const EMAIL_ALIASES = ["email", "email address", "email_address", "e-mail"];
const COMPANY_ALIASES = ["company", "company name", "company_name", "organisation", "organization", "startup"];
const STATUS_ALIASES = ["status", "review status", "review_status"];
const DATE_ALIASES = ["submitted_at", "submitted at", "date", "submission date", "submission_date", "applied_at"];
const ANSWERS_ALIASES = ["answers_json", "answers", "responses", "form_answers"];

function resolveHeader(header: string): string {
    const h = header.toLowerCase().trim();
    if (NAME_ALIASES.includes(h)) return "name";
    if (EMAIL_ALIASES.includes(h)) return "email";
    if (COMPANY_ALIASES.includes(h)) return "company";
    if (STATUS_ALIASES.includes(h)) return "status";
    if (DATE_ALIASES.includes(h)) return "submitted_at";
    if (ANSWERS_ALIASES.includes(h)) return "answers_json";
    return h; // keep as-is for custom answer columns
}

// ─── CSV parsing ───────────────────────────────────────────────────────────────

/**
 * Splits a single CSV line respecting quoted fields.
 * Handles commas inside quoted strings and escaped double-quotes ("").
 */
function splitCSVLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === "," && !inQuotes) {
            cells.push(current);
            current = "";
        } else {
            current += ch;
        }
    }
    cells.push(current);
    return cells;
}

/**
 * Parses raw CSV text into structured `ParsedRow` objects.
 * The first row is treated as headers. Unknown columns are folded into `answers`.
 */
export function parseCSVText(csvText: string): ParseResult {
    // Strip BOM if present
    const text = csvText.startsWith("\uFEFF") ? csvText.slice(1) : csvText;
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");

    if (lines.length < 2) {
        return {
            rows: [],
            errors: [{ rowIndex: 0, message: "File appears empty or has no data rows." }],
        };
    }

    const rawHeaders = splitCSVLine(lines[0]);
    const headers = rawHeaders.map(resolveHeader);

    const rows: ParsedRow[] = [];
    const errors: ImportError[] = [];

    for (let i = 1; i < lines.length; i++) {
        const rowIndex = i; // 1-based
        const cells = splitCSVLine(lines[i]);

        const rowMap: Record<string, string> = {};
        headers.forEach((h, idx) => {
            rowMap[h] = (cells[idx] || "").trim();
        });

        // Validate email (required)
        const email = rowMap["email"] || "";
        if (!email || !email.includes("@")) {
            errors.push({
                rowIndex,
                message: `Row ${rowIndex}: missing or invalid email — "${email || "(empty)"}"`,
                raw: lines[i],
            });
            continue;
        }

        // Parse answers_json if present
        let answers: Record<string, string> = {};
        if (rowMap["answers_json"]) {
            try {
                answers = JSON.parse(rowMap["answers_json"]);
            } catch {
                // Non-fatal: store as raw string
                answers = { raw: rowMap["answers_json"] };
            }
        }

        // Any unrecognised columns go into answers
        const knownKeys = new Set(["name", "email", "company", "status", "submitted_at", "answers_json"]);
        Object.entries(rowMap).forEach(([k, v]) => {
            if (!knownKeys.has(k) && v) {
                answers[k] = v;
            }
        });

        rows.push({
            name: rowMap["name"] || "",
            email,
            company: rowMap["company"] || "",
            status: rowMap["status"] || "new",
            submitted_at: rowMap["submitted_at"] || new Date().toISOString(),
            answers,
            rowIndex,
        });
    }

    return { rows, errors };
}

// ─── Supabase insert ───────────────────────────────────────────────────────────

const VALID_STATUSES = new Set(["new", "reviewing", "shortlist", "interview", "accepted", "rejected", "archived"]);
const BATCH_SIZE = 50;

/**
 * Inserts parsed rows into the `applications` table.
 *
 * Duplicate detection is based on `applicant_email` within the same `program_id`.
 * - `skip`: existing emails are silently ignored.
 * - `overwrite`: existing rows are updated with the new data.
 */
export async function insertApplications(
    rows: ParsedRow[],
    programId: string,
    mode: DuplicateMode,
    supabaseClient: SupabaseClient
): Promise<ImportResult> {
    let inserted = 0;
    let skipped = 0;
    const errors: ImportError[] = [];

    // Fetch existing emails for this program upfront (single query)
    const { data: existingData, error: fetchError } = await supabaseClient
        .from("applications")
        .select("id, applicant_email")
        .eq("program_id", programId);

    if (fetchError) {
        return {
            inserted: 0,
            skipped: 0,
            errors: [{ rowIndex: 0, message: `Failed to check existing applicants: ${fetchError.message}` }],
        };
    }

    const existingMap = new Map<string, string>(); // email → id
    (existingData || []).forEach((r: any) => {
        if (r.applicant_email) existingMap.set(r.applicant_email.toLowerCase(), r.id);
    });

    // Separate rows into inserts and updates
    const toInsert: ParsedRow[] = [];
    const toUpdate: (ParsedRow & { existingId: string })[] = [];

    for (const row of rows) {
        const emailLower = row.email.toLowerCase();
        const existingId = existingMap.get(emailLower);

        if (existingId) {
            if (mode === "skip") {
                skipped++;
            } else {
                toUpdate.push({ ...row, existingId });
            }
        } else {
            toInsert.push(row);
        }
    }

    // Batch inserts
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const payload = batch.map((row) => ({
            program_id: programId,
            applicant_email: row.email,
            applicant_name: row.name || null,
            company_name: row.company || null,
            status: VALID_STATUSES.has(row.status.toLowerCase()) ? row.status.toLowerCase() : "new",
            submitted_at: row.submitted_at || new Date().toISOString(),
            answers: row.answers,
        }));

        const { error } = await supabaseClient.from("applications").insert(payload);

        if (error) {
            batch.forEach((row) =>
                errors.push({ rowIndex: row.rowIndex, message: error.message })
            );
        } else {
            inserted += batch.length;
        }
    }

    // Batch updates (overwrite mode)
    for (const row of toUpdate) {
        const { error } = await supabaseClient
            .from("applications")
            .update({
                applicant_name: row.name || null,
                company_name: row.company || null,
                status: VALID_STATUSES.has(row.status.toLowerCase()) ? row.status.toLowerCase() : "new",
                answers: row.answers,
                updated_at: new Date().toISOString(),
            })
            .eq("id", row.existingId);

        if (error) {
            errors.push({ rowIndex: row.rowIndex, message: error.message });
        } else {
            inserted++;
        }
    }

    return { inserted, skipped, errors };
}
