-- 1. Trigger to prevent cohort creation if owner lacks billing access
create or replace function public.check_program_creation_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not public.has_pro_access(new.owner_id) then
        raise exception 'Active subscription required to create a program.';
    end if;
    return new;
end;
$$;

drop trigger if exists enforce_program_creation_access on public.programs;
create trigger enforce_program_creation_access
    before insert on public.programs
    for each row
    execute procedure public.check_program_creation_access();

-- 2. Update submit_application_secure to enforce billing limits
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

    if not public.has_pro_access(v_owner_id) then
        raise exception 'This program is currently inactive or suspended due to billing.';
    end if;

    select count(*) into v_monthly_apps
    from public.applications a
    join public.programs p on p.id = a.program_id
    where p.owner_id = v_owner_id
      and a.submitted_at >= date_trunc('month', now());

    if v_monthly_apps >= 500 then
        raise exception 'This program has reached its maximum monthly application limit.';
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
