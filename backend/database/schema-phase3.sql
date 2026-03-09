-- Phase 3: Add workflow deployment tracking to schedules
-- Run this in Supabase SQL Editor

-- Add workflow_deployed column to track GitHub Actions workflow status
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS workflow_deployed BOOLEAN DEFAULT FALSE;

-- Add index for querying schedules by workflow deployment status
CREATE INDEX IF NOT EXISTS idx_schedules_workflow_deployed ON schedules(workflow_deployed);

-- Update status column to allow 'active' status
-- (No change needed to schema, just documentation that status can be: scheduled, active, completed, failed, pending)

COMMENT ON COLUMN schedules.workflow_deployed IS 'Indicates whether GitHub Actions workflow has been deployed to the repository';
