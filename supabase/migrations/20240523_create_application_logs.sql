-- Create a table for application processing logs and security events
CREATE TABLE IF NOT EXISTS public.application_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- e.g., 'threshold_match', 'security_warning', 'error'
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies (optional, but good practice)
ALTER TABLE public.application_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to admins/program owners (adjust based on your auth model)
-- Allow read access to admins/program owners (adjust based on your auth model)
DROP POLICY IF EXISTS "Admins can view logs" ON public.application_logs;
CREATE POLICY "Admins can view logs" ON public.application_logs
    FOR SELECT
    USING (
        exists (
            select 1 from public.programs
            where id = application_logs.program_id
            and owner_id = auth.uid()
        )
        OR 
        exists (
            select 1 from public.program_reviewers
            where program_id = application_logs.program_id
            and user_id = auth.uid()
            and role = 'admin'
        )
    );

-- Allow service role to insert logs (Edge Functions use service role)
-- Note: explicit insert policy not needed for service role as it bypasses RLS,
-- but good to document intent or if trigger-based inserts use a different role.
