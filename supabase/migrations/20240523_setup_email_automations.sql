-- Enable the pg_net extension for making HTTP requests
create extension if not exists "pg_net";

-- 1. TRIGGER FUNCTION FOR REVIEWER INVITE
create or replace function public.on_reviewer_invited()
returns trigger as $$
declare
  reviewer_email text;
  program_name text;
begin
  -- Get reviewer email and program name
  select p.email, prog.name into reviewer_email, program_name
  from public.profiles p
  join public.programs prog on prog.id = new.program_id
  where p.id = new.user_id;

  -- Call send-email Edge Function
  perform net.http_post(
    url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'apikey'
    ),
    body := jsonb_build_object(
      'to', reviewer_email,
      'subject', 'You invite to join ' || program_name,
      'template', 'reviewer-invite',
      'data', jsonb_build_object(
        'programName', program_name,
        'inviteLink', 'https://cohortly.app/invite/' || new.program_id, -- Placeholder
        'role', new.role
      )
    )
  );
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for program_reviewers
drop trigger if exists trigger_reviewer_invited on public.program_reviewers;
create trigger trigger_reviewer_invited
  after insert on public.program_reviewers
  for each row execute procedure public.on_reviewer_invited();


-- 2. TRIGGER FUNCTION FOR APPLICATION STATUS CHANGE
create or replace function public.on_application_status_update()
returns trigger as $$
declare
  prog_name text;
  email_subject text;
  email_template text;
begin
  -- Only proceed if status has changed and matches our target statuses
  if (old.status is distinct from new.status) and (new.status in ('shortlist', 'rejected')) then
    
    -- Get program name
    select name into prog_name
    from public.programs
    where id = new.program_id;

    if new.status = 'shortlist' then
      email_subject := 'Good news: You''ve been shortlisted for ' || prog_name;
      email_template := 'application-shortlisted';
    else
      email_subject := 'Update on your application for ' || prog_name;
      email_template := 'application-rejected';
    end if;

    -- Call send-email Edge Function
    perform net.http_post(
      url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'apikey'
      ),
      body := jsonb_build_object(
        'to', new.applicant_email,
        'subject', email_subject,
        'template', email_template,
        'data', jsonb_build_object(
          'programName', prog_name,
          'nextSteps', 'We will contact you shortly.', -- Customize further if needed
          'feedback', '' -- Placeholder
        )
      )
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger for applications
drop trigger if exists trigger_application_status_update on public.applications;
create trigger trigger_application_status_update
  after update on public.applications
  for each row execute procedure public.on_application_status_update();
