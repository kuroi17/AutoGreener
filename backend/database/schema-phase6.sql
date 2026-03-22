-- Phase 6: Ensure workflow deployment tracking column exists in all environments.
-- Run this in Supabase SQL editor for production/staging databases.

ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS workflow_deployed BOOLEAN DEFAULT FALSE;

UPDATE schedules
SET workflow_deployed = FALSE
WHERE workflow_deployed IS NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_workflow_deployed
ON schedules(workflow_deployed);

CREATE INDEX IF NOT EXISTS idx_schedules_status_workflow
ON schedules(status, workflow_deployed);
