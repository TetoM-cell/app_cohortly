create table if not exists public.subscriptions (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    lemon_customer_id text,
    lemon_subscription_id text unique,
    lemon_order_id text,
    plan text not null default 'pro',
    status text not null default 'inactive',
    variant_id text,
    billing_interval text,
    currency text,
    product_name text,
    variant_name text,
    card_brand text,
    card_last_four text,
    trial_ends_at timestamptz,
    renews_at timestamptz,
    ends_at timestamptz,
    cancelled_at timestamptz,
    raw_payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
    id uuid primary key default uuid_generate_v4(),
    event_key text not null unique,
    event_name text not null,
    lemon_object_id text not null,
    user_id uuid references public.profiles(id) on delete set null,
    payload jsonb not null,
    processed_at timestamptz not null default now()
);

create index if not exists idx_billing_events_user_id
    on public.billing_events (user_id, processed_at desc);

alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription" on public.subscriptions
    for select using (auth.uid() = user_id);

create or replace function public.get_billing_usage_summary()
returns table (
    active_programs bigint,
    total_applications bigint,
    current_month_applications bigint
)
language sql
security definer
stable
set search_path = ''
as $$
    select
        (
            select count(*)
            from public.programs p
            where p.owner_id = auth.uid()
              and p.status != 'archived'
        ) as active_programs,
        (
            select count(*)
            from public.applications a
            join public.programs p on p.id = a.program_id
            where p.owner_id = auth.uid()
        ) as total_applications,
        (
            select count(*)
            from public.applications a
            join public.programs p on p.id = a.program_id
            where p.owner_id = auth.uid()
              and a.submitted_at >= date_trunc('month', now())
        ) as current_month_applications
$$;

grant execute on function public.get_billing_usage_summary() to authenticated;
