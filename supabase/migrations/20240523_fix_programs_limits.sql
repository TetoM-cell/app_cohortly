-- Fix limits on programs table columns to avoid overflow errors
-- This alters existing columns to TEXT to remove arbitrary length limits
ALTER TABLE public.programs ALTER COLUMN logo_url TYPE text;
ALTER TABLE public.programs ALTER COLUMN description TYPE text;
ALTER TABLE public.programs ALTER COLUMN name TYPE text;
ALTER TABLE public.programs ALTER COLUMN type TYPE text;
