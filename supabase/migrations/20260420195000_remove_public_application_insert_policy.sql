-- Remove direct public inserts for applications.
-- Public application submission should go through submit_application_secure().

drop policy if exists "Anyone can insert applications" on public.applications;
