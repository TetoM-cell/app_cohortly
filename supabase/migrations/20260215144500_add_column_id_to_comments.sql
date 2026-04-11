-- Add column_id to comments table regarding which cell/field the comment is for
ALTER TABLE comments ADD COLUMN IF NOT EXISTS column_id TEXT;

-- Add updated_at if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'updated_at') THEN
        ALTER TABLE comments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;
