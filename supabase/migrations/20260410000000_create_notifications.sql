-- Create notifications table
create table if not exists public.notifications (
    id uuid primary key default uuid_generate_v4(),
    recipient_id uuid not null references public.profiles(id) on delete cascade,
    type varchar(50) not null, -- 'invitation', 'alert'
    title varchar(255) not null,
    message text,
    metadata jsonb default '{}'::jsonb, -- {program_id, role, inviter_email, cohort_name}
    status varchar(20) default 'active', -- 'active', 'accepted', 'ignored', 'archived'
    created_at timestamptz default now()
);

-- RLS
alter table public.notifications enable row level security;

drop policy if exists "Users can see their own notifications" on public.notifications;
create policy "Users can see their own notifications"
    on public.notifications for select
    using (auth.uid() = recipient_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
    on public.notifications for update
    using (auth.uid() = recipient_id);

drop policy if exists "Anyone authenticated can insert notifications" on public.notifications;
create policy "Anyone authenticated can insert notifications"
    on public.notifications for insert
    with check (auth.role() = 'authenticated');

-- Allow users to accept invitations (insert themselves into program_reviewers)
drop policy if exists "Users can accept invitations" on public.program_reviewers;
create policy "Users can accept invitations"
    on public.program_reviewers
    for insert
    with check (
        exists (
            select 1 from public.notifications
            where recipient_id = auth.uid()
            and type = 'invitation'
            and status = 'active'
            and (metadata->>'program_id')::uuid = program_id
        )
    );
