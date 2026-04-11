-- COHORTLY OPTIMIZED SCHEMA (Free-Tier Efficiency Focus)
-- Consolidates relationships via JSONB and enforces strict character limits.
-- This script is idempotent (can be run multiple times).

create extension if not exists "uuid-ossp";

-- enumerations for controlled status flags
DO $$ BEGIN
    create type public.prog_status as enum ('draft', 'published', 'closed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    create type public.app_status as enum ('new', 'reviewing', 'shortlist', 'interview', 'accepted', 'rejected', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    create type public.reviewer_role as enum ('admin', 'reviewer', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. PROFILES
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name varchar(100),
    email varchar(100),
    avatar_url text,
    role reviewer_role default 'admin',
    preferences jsonb default '{}'::jsonb, -- dynamic settings
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS for PROFILES
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users" on public.profiles
    for select using (auth.role() = 'authenticated');

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
    for update using (auth.uid() = id);

-- FUNCTION: Handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, email, avatar_url)
    values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.email,
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do update set
        full_name = excluded.full_name,
        email = excluded.email,
        avatar_url = excluded.avatar_url;
    return new;
end;
$$ language plpgsql 
security definer
set search_path = '';

-- TRIGGER: Create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- 2. PROGRAMS
create table if not exists public.programs (
    id uuid primary key default uuid_generate_v4(),
    owner_id uuid not null references public.profiles(id),
    name varchar(100) not null,
    slug varchar(50) not null unique,
    type varchar(50), 
    description varchar(500), -- enforced small limit
    logo_url text,
    open_date timestamptz,
    deadline timestamptz,
    status prog_status default 'draft',
    collect_name boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. FORMS & QUESTIONS (Merged for efficiency)
create table if not exists public.forms (
    id uuid primary key default uuid_generate_v4(),
    program_id uuid not null references public.programs(id) on delete cascade,
    title varchar(100) not null,
    description varchar(500),
    cover_image_url text,
    fields jsonb default '[]'::jsonb, -- Array<{id, type, label, req, opt:[], order:smallint, logic:[]}>
    thank_you_msg varchar(255) default 'Thank you!',
    created_at timestamptz default now()
);

-- 4. RUBRICS (Weights and prompts)
create table if not exists public.rubrics (
    id uuid primary key default uuid_generate_v4(),
    program_id uuid not null references public.programs(id) on delete cascade,
    name varchar(100) not null,
    weight numeric(5,2) check (weight >= 0 and weight <= 100),
    description varchar(255),
    prompt varchar(1000), -- AI instructions
    created_at timestamptz default now()
);

-- 5. APPLICATIONS (THE CONSOLIDATED ENGINE)
create table if not exists public.applications (
    id uuid primary key default uuid_generate_v4(),
    program_id uuid not null references public.programs(id) on delete cascade,
    applicant_email varchar(100) not null,
    applicant_name varchar(100),
    company_name varchar(100),
    status app_status default 'new',
    ai_explanation text,
    submitted_at timestamptz default now(),
    
    -- CORE DATA AS JSONB (Reduces row count and table joins)
    answers jsonb default '{}'::jsonb, -- {q_id: value}
    files jsonb default '[]'::jsonb,    -- [{url, name, size}]
    
    -- SCORES AS JSONB (Keys are rubric_id)
    -- Structure: {rubric_id: {score: numeric, reason: text}}
    scores jsonb default '{}'::jsonb,
    overall_ai_score numeric(5,2) default 0.00,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 6. TRESHOLD RULES (Low volume table)
create table if not exists public.threshold_rules (
    id uuid primary key default uuid_generate_v4(),
    program_id uuid not null references public.programs(id) on delete cascade,
    target varchar(50), -- overall_ai_score or rubric_id
    operator varchar(2) check (operator in ('>', '<', '>=', '<=', '=')),
    value numeric(5,2) not null,
    action varchar(20) check (action in ('shortlist', 'reject', 'flag')),
    enabled boolean default true
);

-- 7. TEAM ACCESS (RLS Enforcer)
create table if not exists public.program_reviewers (
    id uuid primary key default uuid_generate_v4(),
    program_id uuid not null references public.programs(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    role reviewer_role default 'reviewer',
    unique(program_id, user_id)
);

-- 8. INTERNAL COMMENTS
create table if not exists public.comments (
    id uuid primary key default uuid_generate_v4(),
    application_id uuid not null references public.applications(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    text varchar(1000) not null,
    created_at timestamptz default now()
);

-- INDEXES (Avoid Full Scans)
create index if not exists idx_app_prog_status on public.applications (program_id, status) where status != 'archived';
create index if not exists idx_app_overall on public.applications (overall_ai_score desc);
create index if not exists idx_rev_user on public.program_reviewers (user_id);

-- RLS POLICIES (Privacy + Efficiency)
alter table public.programs enable row level security;
alter table public.applications enable row level security;
alter table public.forms enable row level security;
alter table public.rubrics enable row level security;
alter table public.threshold_rules enable row level security;

-- FUNCTION: Check reviewer status (Bypasses RLS to avoid recursion)
create or replace function public.is_program_reviewer(_program_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.program_reviewers
    where program_id = _program_id
    and user_id = auth.uid()
  );
$$;

-- PROGRAMS
drop policy if exists "Prog viewable by owners/reviewers" on public.programs;
create policy "Prog viewable by owners/reviewers" on public.programs
for select using (
    owner_id = auth.uid() or
    public.is_program_reviewer(id)
);

drop policy if exists "Owners can insert programs" on public.programs;
create policy "Owners can insert programs" on public.programs
for insert with check (auth.uid() = owner_id);

drop policy if exists "Owners can update programs" on public.programs;
create policy "Owners can update programs" on public.programs
for update using (auth.uid() = owner_id);

drop policy if exists "Owners can delete programs" on public.programs;
create policy "Owners can delete programs" on public.programs
for delete using (auth.uid() = owner_id);

-- APPLICATIONS
drop policy if exists "Reviewers see program apps" on public.applications;
create policy "Reviewers see program apps" on public.applications
for select using (
    public.is_program_reviewer(program_id) or 
    exists (
        select 1 from public.programs
        where id = applications.program_id
        and owner_id = auth.uid()
    )
);

-- FORMS
drop policy if exists "Owners can manage forms" on public.forms;
create policy "Owners can manage forms" on public.forms
for all using (
    exists (
        select 1 from public.programs
        where id = forms.program_id
        and owner_id = auth.uid()
    )
);

-- RUBRICS
drop policy if exists "Owners can manage rubrics" on public.rubrics;
create policy "Owners can manage rubrics" on public.rubrics
for all using (
    exists (
        select 1 from public.programs
        where id = rubrics.program_id
        and owner_id = auth.uid()
    )
);

-- THRESHOLD RULES
drop policy if exists "Owners can manage threshold rules" on public.threshold_rules;
create policy "Owners can manage threshold rules" on public.threshold_rules
for all using (
    exists (
        select 1 from public.programs
        where id = threshold_rules.program_id
        and owner_id = auth.uid()
    )
);

-- PROGRAM REVIEWERS
alter table public.program_reviewers enable row level security;
drop policy if exists "Owners can manage reviewers" on public.program_reviewers;
create policy "Owners can manage reviewers" on public.program_reviewers
for all using (
    exists (
        select 1 from public.programs
        where id = program_reviewers.program_id
        and owner_id = auth.uid()
    )
);

-- COMMENTS
alter table public.comments enable row level security;
drop policy if exists "Reviewers can manage comments" on public.comments;
create policy "Reviewers can manage comments" on public.comments
for all using (
    user_id = auth.uid() or
    exists (
        select 1 from public.programs p
        join public.applications a on a.program_id = p.id
        where a.id = comments.application_id
        and p.owner_id = auth.uid()
    )
);

-- ALLOW PUBLIC INSERT FOR APPLICATIONS
create policy "Anyone can insert applications" on public.applications for insert with check (true);
