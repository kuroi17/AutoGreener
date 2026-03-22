-- Phase 5: Multi-push support per schedule
-- Adds push_count so one scheduled slot can create multiple commits.

ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS push_count INTEGER DEFAULT 1;

-- Keep values in safe range
UPDATE schedules
SET push_count = 1
WHERE push_count IS NULL OR push_count < 1;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'schedules_push_count_range'
	) THEN
		ALTER TABLE schedules
		ADD CONSTRAINT schedules_push_count_range
		CHECK (push_count >= 1 AND push_count <= 20);
	END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_schedules_push_count ON schedules(push_count);
