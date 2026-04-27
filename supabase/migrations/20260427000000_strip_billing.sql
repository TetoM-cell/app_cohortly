-- Remove billing triggers and functions
drop trigger if exists enforce_program_creation_access on public.programs;
drop function if exists public.check_program_creation_access();

-- Recreate submit_application_secure without billing limits
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

    -- Safety Limit: 500 applications per month per user
    declare
        v_owner_id uuid;
        v_monthly_apps integer;
    begin
        select owner_id into v_owner_id from public.programs where id = p_program_id;
        
        if v_owner_id is not null then
            select count(*) into v_monthly_apps
            from public.applications a
            join public.programs p on p.id = a.program_id
            where p.owner_id = v_owner_id
              and a.submitted_at >= date_trunc('month', now());

            if v_monthly_apps >= 500 then
                raise exception 'This program has reached its maximum monthly application limit.';
            end if;
        end if;
    end;

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

-- Drop billing-related functions
drop function if exists public.has_pro_access(uuid);

-- Drop billing tables if they exist
drop table if exists public.subscriptions cascade;
drop table if exists public.billing_customers cascade;
drop table if exists public.prices cascade;
drop table if exists public.products cascade;
