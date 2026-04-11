**You are building the "Create New Cohort" wizard in Cohortly, a micro-SaaS for accelerators, grant programs, university fellowships and niche selection processes. This wizard is the most important onboarding & value-delivery screen in the product.**

Treat the following description as the **SINGLE SOURCE OF TRUTH** for the entire create-cohort user flow, UI structure, behavior and priorities. Whenever you generate, edit or refactor any component related to cohort creation (Tabs 1–4, dashboard trigger, form builder, rubric editor, launch screen, etc.), always refer back to this exact specification first.

## COMPLETE USER FLOW – CREATE NEW COHORT (as of January 2026)

1. ### Entry point
   • From main Cohort Dashboard (Notion-style table showing all cohorts)
   • Top-right or sidebar: large primary button "+ New Cohort" / "Create new program"
   • Clicking opens full-screen or large modal wizard with 4 horizontal tabs at top

2. ### Tab 1 – Cohort Basics
   • Large heading: "Create a new cohort"
   • Form fields (single-column, mobile-friendly):
     - Cohort/Program Name (required, large input)
     - Short Description (textarea, public blurb for apply page)
     - Program Type (dropdown: Accelerator, Incubator, Grant, Fellowship, University Program, Other)
     - Application Open Date & Deadline (date pickers, side-by-side)
     - Expected # of applications (dropdown: <100, 100–500, 500+)
     - Program Logo (square image upload + preview)
   • Below form: prominent "Start from a template" carousel/grid
     - Templates: Y Combinator-style, Techstars Accelerator, NSF Grant Proposal, University Fellowship, Climate Impact Fund, Blank
     - Clicking "Use this template" auto-fills name/description/type (if desired) and pre-loads form + rubric in later tabs
   • Bottom: primary button "Continue to Form Builder" (disabled until name + dates filled)
     + small "Save draft" link (saves incomplete cohort)

3. ### Tab 2 – Form Builder
   • Two-panel layout (responsive – stack on mobile):
     - Left sidebar (320px): Question library – categorized draggable cards (Basic, Files & Media, Choices, Startup/Grant Specific, Advanced)
     - Right canvas: drag-and-drop builder
       - Starts with editable Cover page (title, description, image)
       - Add sections → drag questions into sections
       - Inline editing + settings modal per question (required toggle, conditional logic tab)
       - Drag-to-reorder sections & questions
     - Sheet panel (50% viewport collapsible): live public form preview (updates instantly, mobile/desktop toggle)
   • Top bar: Add section / Cover page toggles
   • Bottom: "Continue to Rubric & AI Scoring" button + progress indicator

4. ### Tab 3 – Rubric & AI Scoring
   • Headline: "Teach the AI how to score applications"
   • Top: Rubric Template Gallery (grid/carousel)
     - Same templates as Tab 1 + corresponding criteria/weights/prompts
     - "Use this rubric" loads table below
   • Main: Rubric builder table
     - Columns: Criterion name (editable), Weight % (0–100, live total), AI prompt/description, duplicate/delete
     - Drag-to-reorder rows, + Add criterion floating button
     - Total weight indicator (green at 100%, red otherwise)
   • Below: Smart Thresholds panel
     - Toggle: Enable auto-actions
     - Add rules: Target (Overall or criterion) → operator → value → action (Auto-shortlist / Auto-reject / Flag / Tag / Notify)
     - Starter rules on enable
   • Optional tester: "Test AI scoring" card (paste sample → mock scores + thresholds)
   • Bottom: "Continue to Settings & Launch"

5. ### Tab 4 – Settings & Launch
   • Three cards + final launch area:
     1. Reviewer Management
        - Invite by email → chips with role (Admin/Reviewer/View-only)
        - Toggle: Anonymous review mode
     2. Notifications
        - Slack webhook + connect
        - Email alert checkboxes
        - Webhook placeholder
     3. Launch Settings
        - Public URL preview (copyable)
        - QR code placeholder
        - Embed code snippet
        - Readiness checklist
   • Bottom: Massive green button "Open applications and go live" (confetti on success)
     + "Save as draft" secondary
   • After launch → redirect to dashboard, new cohort visible as "Live"

## General rules for the entire wizard
• Auto-save every change (draft mode)
• Allow free navigation between tabs (progress saved)
• Show progress indicator / readiness checklist
• Confetti + success toast on final launch
• Public link generated on launch (cohortly.app/apply/[slug])
• Wizard can be re-opened later to edit existing cohort
• Mobile: stack panels vertically, use tabs/swipe to switch views
• Design: minimalistic, Notion/Framer-like, lots of whitespace, blue accents, dark mode support

**When generating any code related to cohort creation:**
1. First re-read this entire prompt
2. Match layout, copy, behavior and priorities exactly
3. Use React + TypeScript + Tailwind CSS (shadcn/ui preferred)
4. Keep components modular and reusable
5. Add subtle animations (fade, scale on hover)
6. Ensure accessibility (ARIA, keyboard nav)
7. Make loading states, error handling and empty states beautiful

**This is the canonical reference for all create-cohort functionality. Do NOT deviate unless explicitly instructed by the user.**