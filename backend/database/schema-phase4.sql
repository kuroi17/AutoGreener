-- Phase 4: Dashboard Enhancements
-- Run this SQL in Supabase SQL Editor

-- Update status column constraint to include 'active' and 'paused' statuses
ALTER TABLE schedules
DROP CONSTRAINT IF EXISTS schedules_status_check;

ALTER TABLE schedules
ADD CONSTRAINT schedules_status_check
CHECK (status IN ('scheduled', 'active', 'paused', 'in-progress', 'completed', 'error', 'cancelled'));

-- Note: workflow_deployed column was added in Phase 3
-- If you haven't run Phase 3 migration yet, uncomment the following lines:
-- ALTER TABLE schedules ADD COLUMN IF NOT EXISTS workflow_deployed BOOLEAN DEFAULT FALSE;
-- CREATE INDEX IF NOT EXISTS idx_schedules_workflow_deployed ON schedules(workflow_deployed);

-- Create composite index for filtering active/paused workflows
CREATE INDEX IF NOT EXISTS idx_schedules_status_workflow ON schedules(status, workflow_deployed);

-- Optional: Add commit_message column for customizable commit messages
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS commit_message TEXT DEFAULT 'Automated push by PushClock';
