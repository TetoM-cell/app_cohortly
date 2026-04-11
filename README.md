# <p align="center"> <img src="public/logo.png" width="100" alt="Cohortly Logo" /> <br/> **COHORTLY** </p>

### <p align="center"> The Intelligence-First Platform for Modern Program Management </p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/Supabase-DB_%26_Auth-blueviolet?style=for-the-badge&logo=supabase" />
  <img src="https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=for-the-badge&logo=tailwind-css" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react" />
</p>

---

## 🚀 Overview

**Cohortly** is a high-performance, enterprise-grade cohort management system designed to transform how organizations recruit, evaluate, and manage program participants. Built with a focus on **Visual Excellence** and **Operational Intelligence**, Cohortly replaces fragmented spreadsheets and clunky forms with a unified, real-time command center.

Whether you're running a startup accelerator, a corporate innovation program, or a university admission cycle, Cohortly provides the tools to build complex applications in minutes and evaluate them with industrial precision.

---

## 💎 The Three Core Engines

### 1. The Application Engine (Form Builder)
A powerful, no-code wizard that lets program owners design beautiful, multi-stage application forms.
- **Dynamic Wizard Setup**: A 4-step workflow (Basics → Builder → Scoring → Launch).
- **10+ Field Types**: Supported fields include Rich Text, File Uploads, Video Pitches, and Multi-select.
- **Conditional Logic**: Intelligent forms that branch based on applicant responses.
- **Auto-Save Drafts**: Applicants never lose progress thanks to persistent LocalStorage syncing.
- **Custom Branding**: Every program gets a unique slug and customizable hero/brand assets.

### 2. The Evaluation Engine (Scoring & Rubrics)
Move beyond "gut feelings" with structured, rubric-based evaluation.
- **Multi-Criterion Rubrics**: Define weighted criteria (e.g., "Founder Fit", "Technical Depth").
- **AI-Augmented Scoring**: Support for automated AI analysis based on rubric prompts.
- **Threshold Automation**: Program owners can set logic-based triggers:
  - `Score > 85` → **Auto-Shortlist**
  - `Score < 55` → **Auto-Reject**
- **Internal Collaboration**: A full comment system with `@mentions` (emphasized styling) and collaborative threads.

### 3. The Intelligence Engine (Dashboard)
A real-time command center for managing thousands of applications.
- **Supabase Real-time Sync**: Dashboard updates instantly as new applications roll in.
- **Tanstack Table Integration**: Advanced sorting, filtering, and column visibility management.
- **Spotlight Tours**: Interactive onboarding to guide new reviewers through the feature set.
- **Universal Search**: `Cmd + K` interface to jump between programs, settings, and team members.
- **Modern Theming**: Fully responsive Dark Mode and dynamic preferences system for a tailored user experience.


---

## 🛠 Terrifyingly Detailed Features

### 🏢 Program Management
- **Dashboard Command**: View average scores, acceptance rates, and team activity at a glance.
- **Slug Management**: SEO-friendly, unique URL generation for program landing pages.
- **Team Roles**: Define `Admin`, `Reviewer`, and `Viewer` permissions with strict Row Level Security (RLS).

### 📝 Form Builder Sophistication
- **Sectional Design**: Group questions into logical sections with progress tracking.
- **Cover & Logo Support**: Upload program-specific visual assets for a premium applicant experience.
- **Validation**: Strict server-side and client-side validation for emails, phone numbers, and required fields.

### 📊 Applicant Tracking System (ATS)
- **Status Pills**: Visual workflow management (New → Reviewing → Shortlist → Interview → Accepted/Rejected).
- **Data Persistence**: Uses a consolidated JSONB schema in PostgreSQL for hyper-efficient data retrieval.
- **Mention System**: Collaborators can tag each other in comments using a custom `@` mention dropdown.

---

## 💻 Tech Stack

- **Framework**: `Next.js 16 (App Router)`
- **Core Logic**: `React 19`
- **Styling**: `Tailwind CSS 4.0` with `Framer Motion` animations.
- **Backend / Database**: `Supabase` (PostgreSQL with RLS).
- **State Management**: `Zustand` for global UI state.
- **Tables**: `@tanstack/react-table` for high-performance data grids.
- **Auth**: `Supabase Auth` (with Profile syncing via DB Triggers).
- **UI Components**: `Radix UI` primitives for world-class accessibility.

---

## 🔒 Security & Performance

- **PostgreSQL RLS**: Every single query is gated by Row Level Security. Users *cannot* see data they aren't authorized to view.
- **Optimized Schema**: Consolidated relationships via JSONB to reduce expensive table joins and maximize free-tier efficiency.
- **Edge Functions**: Automated workflows (like email notifications) triggered by database events.
- **Image Optimization**: Built-in Next.js image optimization for fast-loading covers and logos.

---

## 🛠 Local Setup

1. **Clone the Repo**
   ```bash
   git clone https://github.com/your-org/cohortly.git
   cd cohortly
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

4. **Run the Engine**
   ```bash
   npm run dev
   ```

---

<p align="center">
  Built with ❤️ for the next generation of cohort managers.
</p>