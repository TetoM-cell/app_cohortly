-- Create user_settings table for integrations
create table if not exists public.user_settings (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    slack_webhook_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_settings enable row level security;

-- Policies
create policy "Users can view own settings" on public.user_settings
    for select using (auth.uid() = user_id);

create policy "Users can update own settings" on public.user_settings
    for insert with check (auth.uid() = user_id);

create policy "Users can update own settings update" on public.user_settings
    for update using (auth.uid() = user_id);
