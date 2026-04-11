import type { Application, Criterion } from "@/app/(pages)/dashboard/components/columns";

// --- CSV helpers ---

/** Wraps a value in double-quotes and escapes any interior quotes. */
function escapeCell(value: unknown): string {
    const str = value === null || value === undefined ? "" : String(value);
    // RFC 4180: if it contains commas, newlines, or quotes, wrap in quotes and double any interior quotes
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function rowToCSV(cells: unknown[]): string {
    return cells.map(escapeCell).join(",");
}

function downloadBlob(blob: Blob, filename: string) {
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

// --- Export functions ---

/**
 * Exports an array of applications to a CSV file and triggers a browser download.
 *
 * Fixed columns: ID, Name, Email*, Company, Status, AI Score, Submitted Date, AI Notes
 * Dynamic columns: one column per rubric criterion (score only)
 *
 * *Email is stored in `answers` as a best-effort lookup; falls back to empty string.
 */
export function exportApplicationsToCSV(
    applications: Application[],
    rubric: Criterion[],
    filename = `cohortly-applicants-${new Date().toISOString().slice(0, 10)}.csv`
): void {
    // Build header row
    const fixedHeaders = [
        "ID",
        "Name",
        "Company",
        "Status",
        "Score",
        "Submitted Date",
        "Notes",
    ];
    const rubricHeaders = rubric.map((c) => c.name);
    const headers = [...fixedHeaders, ...rubricHeaders];

    // Build data rows
    const rows = applications.map((app) => {
        const fixedCells = [
            app.id,
            app.applicantName,
            app.companyName,
            app.status,
            app.overallScore ?? "",
            app.submittedDate ? new Date(app.submittedDate).toLocaleDateString() : "",
            // Strip newlines from AI explanation so it stays in one CSV cell
            app.aiExplanation ? app.aiExplanation.replace(/\n/g, " ") : "",
        ];
        const rubricCells = rubric.map((c) => app.scores?.[c.id] ?? "");
        return [...fixedCells, ...rubricCells];
    });

    // Assemble CSV text
    const csvLines = [
        rowToCSV(headers),
        ...rows.map(rowToCSV),
    ];
    const csvText = csvLines.join("\n");

    // BOM prefix so Excel opens UTF-8 correctly
    const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, filename);
}

/**
 * Generates and downloads a blank template CSV that matches the import format.
 * Useful for guiding users who want to import applicants manually.
 */
export function downloadImportTemplate(
    filename = "cohortly-import-template.csv"
): void {
    const headers = ["name", "email", "company", "status", "submitted_at", "answers_json"];
    const exampleRow = [
        "Jane Doe",
        "jane@example.com",
        "Acme Inc.",
        "new",
        new Date().toISOString().slice(0, 10),
        '{"q1":"Example answer"}',
    ];

    const csvText = [rowToCSV(headers), rowToCSV(exampleRow)].join("\n");
    const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, filename);
}
