-- Guard public application submission with lightweight anti-abuse checks.

create index if not exists idx_applications_program_email_submitted
    on public.applications (program_id, applicant_email, submitted_at desc);

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
