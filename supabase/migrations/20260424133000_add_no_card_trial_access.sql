create table if not exists public.account_trials (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    trial_started_at timestamptz not null default now(),
    trial_ends_at timestamptz not null default (now() + interval '14 days'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.account_trials enable row level security;

drop policy if exists "Users can view own trial" on public.account_trials;
create policy "Users can view own trial" on public.account_trials
    for select using (auth.uid() = user_id);

create or replace function public.ensure_account_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.account_trials (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_profile_created_ensure_trial on public.profiles;
create trigger on_profile_created_ensure_trial
    after insert on public.profiles
    for each row execute procedure public.ensure_account_trial();

insert into public.account_trials (user_id)
select p.id
from public.profiles p
left join public.account_trials t on t.user_id = p.id
where t.user_id is null;

create or replace function public.has_pro_access(_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
    select exists (
        select 1
        from public.account_trials t
        where t.user_id = _user_id
          and t.trial_ends_at > now()
    )
    or exists (
        select 1
        from public.subscriptions s
        where s.user_id = _user_id
          and (
              s.status in ('active', 'on_trial', 'paused', 'past_due')
              or (
                  s.status = 'cancelled'
                  and coalesce(s.ends_at, now() + interval '1 second') > now()
              )
          )
    );
$$;

create or replace function public.get_my_billing_access()
returns table (
    has_access boolean,
    access_state text,
    trial_started_at timestamptz,
    trial_ends_at timestamptz,
    subscription_status text,
    subscription_ends_at timestamptz,
    billing_interval text,
    has_subscription boolean
)
language sql
security definer
stable
set search_path = ''
as $$
    with trial_row as (
        select *
        from public.account_trials
        where user_id = auth.uid()
    ),
    sub_row as (
        select *
        from public.subscriptions
        where user_id = auth.uid()
    )
    select
        public.has_pro_access(auth.uid()) as has_access,
        case
            when exists (select 1 from trial_row where trial_ends_at > now()) then 'trial'
            when exists (
                select 1 from sub_row
                where status in ('active', 'on_trial', 'paused', 'past_due')
            ) then 'subscription'
            when exists (
                select 1 from sub_row
                where status = 'cancelled'
                  and coalesce(ends_at, now() + interval '1 second') > now()
            ) then 'grace_period'
            when exists (select 1 from sub_row) then 'restricted'
            else 'restricted'
        end as access_state,
        (select trial_started_at from trial_row) as trial_started_at,
        (select trial_ends_at from trial_row) as trial_ends_at,
        (select status from sub_row) as subscription_status,
        (select ends_at from sub_row) as subscription_ends_at,
        (select billing_interval from sub_row) as billing_interval,
        exists (select 1 from sub_row where lemon_subscription_id is not null) as has_subscription;
$$;

grant execute on function public.get_my_billing_access() to authenticated;
