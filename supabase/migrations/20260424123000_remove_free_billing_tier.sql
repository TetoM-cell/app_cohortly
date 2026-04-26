alter table if exists public.subscriptions
    alter column plan set default 'pro';

update public.subscriptions
set plan = 'pro'
where plan = 'free';
