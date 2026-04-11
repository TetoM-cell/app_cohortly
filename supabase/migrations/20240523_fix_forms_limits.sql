-- Fix limits on forms table columns to avoid overflow errors
-- This alters existing columns to TEXT to remove arbitrary length limits
ALTER TABLE public.forms ALTER COLUMN title TYPE text;
ALTER TABLE public.forms ALTER COLUMN description TYPE text;
ALTER TABLE public.forms ALTER COLUMN cover_image_url TYPE text;
ALTER TABLE public.forms ALTER COLUMN thank_you_msg TYPE text;
