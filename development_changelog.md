# Cohortly Development Changelog

This document tracks the significant functional and architectural changes made to the Cohortly platform.

## Latest Updates (April 17, 2026)

### 1. Application Window & Gating
*   **Feature**: Implemented automatic application window gating based on `open_date` and `deadline`.
*   **Logic**: The application form now checks the current timestamp and renders specific "Not Yet Open" or "Applications Closed" states if outside the allowed window.
*   **Management**: Added date-time pickers to the **Cohort Basics** wizard step and the **Cohort Settings** sheet for real-time window adjustments.

### 2. Support & Contact Integration
*   **Feature**: Added a "Contact & Support" section to the Cohort Wizard (Step 4).
*   **Persistence**: Added `contact_email` to the `programs` table.
*   **UI**: The application form and success pages now dynamically display the program's specific support email, ensuring applicants have a clear line of communication.

### 3. Review Portal Optimization
*   **Next.js 15 Compatibility**: Updated `ReviewPortal` to handle `params` as a Promise using `React.use()`, resolving a critical hydration/routing error.
*   **Comment Persistence**: Fixed a synchronization bug where comments wouldn't appear immediately. Added real-time re-fetching and optimistic UI updates.
*   **Activity Logs**: Integrated comments into the applicant's activity feed. Every comment now generates a log entry (e.g., *"Added a comment on Traction"*).
*   **Auto-save Feedback**: Added a subtle "Auto-saved" indicator to the Review Portal to give guest reviewers confidence that their progress is captured.

### 4. Admin Dashboard Enhancements
*   **Discoverability**: Relocated the "Copy Guest Link" action from the header into the **Data Table Toolbar** settings menu for better workflow integration.
*   **Feedback**: Integrated `sonner` toast notifications for the copy-to-clipboard action.
*   **Settings Sync**: Updated the Cohort Settings sheet to allow editing of all new fields (dates, visibility, etc.) without re-running the wizard.

---

## Technical Debt & Infrastructure
*   **Database Schema**: Provided SQL migrations for `contact_email`, `open_date`, and `deadline`.
*   **State Management**: Standardized the mapping of criterion-specific comments using `column_id` across both the Admin Dashboard and the Guest Review Portal.
*   **Real-time**: Leveraged Supabase real-time channels for instant UI updates when comments are added or scores are changed.

## Pending / Next Steps
*   [ ] Formalize the email invitation system for guest reviewers (currently relies on link sharing).
*   [ ] Implement a "Preview" mode for the application form within the wizard.
*   [ ] Add file upload support for applicant attachments in the review portal.
