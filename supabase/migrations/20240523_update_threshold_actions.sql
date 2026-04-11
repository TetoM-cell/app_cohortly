-- Migration to update allowed actions in threshold_rules
-- 1. Update any existing 'accept' actions to 'shortlist'
UPDATE public.threshold_rules 
SET action = 'shortlist' 
WHERE action = 'accept';

-- 2. Drop the old constraint
ALTER TABLE public.threshold_rules 
DROP CONSTRAINT IF EXISTS threshold_rules_action_check;

-- 3. Add the new constraint allowing 'shortlist' and removing 'accept'
ALTER TABLE public.threshold_rules 
ADD CONSTRAINT threshold_rules_action_check 
CHECK (action IN ('shortlist', 'reject', 'flag'));
