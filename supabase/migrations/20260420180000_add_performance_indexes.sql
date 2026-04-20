-- Performance indexes for current dashboard, review, sidebar, and log access patterns.

create index if not exists idx_applications_program_submitted_at
    on public.applications (program_id, submitted_at desc);

create index if not exists idx_comments_application_created_at
    on public.comments (application_id, created_at desc);

create index if not exists idx_comments_user_id
    on public.comments (user_id);

create index if not exists idx_application_logs_program_created_at
    on public.application_logs (program_id, created_at desc);
