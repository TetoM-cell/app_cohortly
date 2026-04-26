-- Add super admin flag to profiles
alter table public.profiles 
add column if not exists is_super_admin boolean default false;

-- Update has_pro_access to always return true for super admins
create or replace function public.has_pro_access(_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
    select exists (
        select 1 from public.profiles where id = _user_id and is_super_admin = true
    )
    or exists (
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

-- Update submit_application_secure to bypass the 500 application limit for super admins
create or replace function public.submit_application_secure(
    p_program_id uuid,
    p_applicant_email text,
    p_applicant_name text,
    p_company_name text,
    p_answers jsonb,
    p_submitted_at timestamptz,
    p_rendered_at timestamptz default null,
    p_honeypot text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    new_app public.applications;
    normalized_email text;
    v_owner_id uuid;
    v_monthly_apps integer;
    v_is_super_admin boolean;
begin
    normalized_email := lower(trim(coalesce(p_applicant_email, '')));

    if coalesce(trim(p_honeypot), '') <> '' then
        raise exception 'Submission blocked.';
    end if;

    if normalized_email = '' then
        raise exception 'Applicant email is required.';
    end if;

    if p_rendered_at is null or (now() - p_rendered_at) < interval '5 seconds' then
        raise exception 'Form submitted too quickly. Please review your application and try again.';
    end if;

    -- Billing Guards: Access & Limit Checks
    select owner_id into v_owner_id from public.programs where id = p_program_id;
    
    if v_owner_id is null then
        raise exception 'Program not found.';
    end if;

    -- Check if owner is a super admin
    select coalesce(is_super_admin, false) into v_is_super_admin 
    from public.profiles 
    where id = v_owner_id;

    if not v_is_super_admin and not public.has_pro_access(v_owner_id) then
        raise exception 'This program is currently inactive or suspended due to billing.';
    end if;

    -- Only check the 500 limit if they are NOT a super admin
    if not v_is_super_admin then
        select count(*) into v_monthly_apps
        from public.applications a
        join public.programs p on p.id = a.program_id
        where p.owner_id = v_owner_id
          and a.submitted_at >= date_trunc('month', now());

        if v_monthly_apps >= 500 then
            raise exception 'This program has reached its maximum monthly application limit.';
        end if;
    end if;
    -- End Billing Guards

    if exists (
        select 1
        from public.applications
        where program_id = p_program_id
          and lower(applicant_email) = normalized_email
          and submitted_at >= now() - interval '10 minutes'
    ) then
        raise exception 'A recent submission already exists for this email. Please wait a few minutes before trying again.';
    end if;

    insert into public.applications (
        program_id,
        applicant_email,
        applicant_name,
        company_name,
        answers,
        status,
        submitted_at
    )
    values (
        p_program_id,
        normalized_email,
        nullif(trim(coalesce(p_applicant_name, '')), ''),
        nullif(trim(coalesce(p_company_name, '')), ''),
        coalesce(p_answers, '{}'::jsonb),
        'new',
        coalesce(p_submitted_at, now())
    )
    returning * into new_app;

    return jsonb_build_object(
        'id', new_app.id,
        'program_id', new_app.program_id,
        'submitted_at', new_app.submitted_at
    );
end;
$$;
