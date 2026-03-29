const schedule = require("node-schedule");
const supabase = require("../config/supabase");
const WorkflowService = require("./workflowService");

// Store active jobs in memory
const activeJobs = new Map();
const RECOVERABLE_STATUSES = new Set(["scheduled", "active"]);
const MISSED_DISPATCH_GRACE_MINUTES = Math.max(
  Number(process.env.MISSED_DISPATCH_GRACE_MINUTES) || 180,
  15,
);
const MISSED_DISPATCH_GRACE_MS = MISSED_DISPATCH_GRACE_MINUTES * 60 * 1000;

/**
 * Normalize schedule shape for downstream workflow calls.
 */
const normalizeSchedule = (item) => {
  if (!item) return item;

  return {
    ...item,
    branch: item.branch || item.source_branch || item.target_branch || null,
    push_count: item.push_count || 1,
  };
};

/**
 * Read user token from database when a scheduled dispatch fires.
 */
const getUserAccessToken = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select("access_token")
    .eq("id", userId)
    .single();

  if (error || !data?.access_token) {
    throw new Error("Missing GitHub access token for user");
  }

  return data.access_token;
};

/**
 * Trigger workflow_dispatch for a specific schedule at the exact target time.
 */
const executeWorkflowDispatch = async (scheduleData) => {
  const { id } = scheduleData;

  console.log(`🚀 Executing scheduled workflow dispatch for schedule ${id}`);
  console.log(`   Repo: ${scheduleData.repo_owner}/${scheduleData.repo_name}`);

  try {
    const accessToken = await getUserAccessToken(scheduleData.user_id);

    await WorkflowService.dispatchWorkflow(
      accessToken,
      normalizeSchedule(scheduleData),
    );

    // Mark in-progress and clear dispatch errors; final success/error comes from sync-status.
    await supabase
      .from("schedules")
      .update({
        status: "in-progress",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    console.log(`✅ Workflow dispatch sent for schedule ${id}`);

    // Remove from active jobs
    activeJobs.delete(id);

    return { success: true };
  } catch (error) {
    console.error(
      `❌ Workflow dispatch failed for schedule ${id}:`,
      error.message,
    );

    // Keep schedule as scheduled so cron fallback can still run while surfacing dispatch error.
    await supabase
      .from("schedules")
      .update({
        status: "scheduled",
        error_message: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Remove from active jobs
    activeJobs.delete(id);

    return {
      success: false,
      error: error.message,
    };
  }
};

const shouldRecoverMissedDispatch = (scheduleData, nowMs) => {
  const pushDate = new Date(scheduleData.push_time);

  if (Number.isNaN(pushDate.getTime())) {
    return { recover: false, reason: "invalid_time" };
  }

  const ageMs = nowMs - pushDate.getTime();

  if (ageMs < 0) {
    return { recover: false, reason: "future" };
  }

  if (!RECOVERABLE_STATUSES.has(scheduleData.status)) {
    return { recover: false, reason: "status_not_recoverable" };
  }

  if (ageMs > MISSED_DISPATCH_GRACE_MS) {
    return { recover: false, reason: "too_old" };
  }

  return {
    recover: true,
    ageMinutes: Math.floor(ageMs / (60 * 1000)),
  };
};

/**
 * Schedule an exact-time workflow dispatch for a specific schedule.
 */
const scheduleJob = (scheduleData) => {
  const { id, push_time } = scheduleData;

  // Cancel existing job if any
  if (activeJobs.has(id)) {
    activeJobs.get(id).cancel();
  }

  const pushDate = new Date(push_time);

  // Only schedule GitHub-backed schedules. Local-path legacy rows are ignored.
  const isGitHubBacked = Boolean(
    scheduleData.repo_owner && scheduleData.repo_name,
  );
  if (!isGitHubBacked) {
    return null;
  }

  // Check if the push_time is in the future
  if (pushDate <= new Date()) {
    console.log(`⚠️ Schedule ${id} is in the past, skipping`);
    return null;
  }

  // Create a new scheduled job
  const job = schedule.scheduleJob(pushDate, async () => {
    console.log(`⏰ Triggered: Schedule ${id} at ${new Date().toISOString()}`);
    await executeWorkflowDispatch(scheduleData);
  });

  if (job) {
    activeJobs.set(id, job);
    console.log(`📅 Scheduled job for ${id} at ${pushDate.toISOString()}`);
  }

  return job;
};

/**
 * Load all pending schedules from database and schedule them
 */
const loadSchedules = async () => {
  console.log("📥 Loading schedules from database...");

  try {
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .in("status", ["scheduled", "active", "in-progress"]);

    if (error) throw error;

    console.log(`   Found ${data.length} schedules to evaluate`);

    const nowMs = Date.now();

    for (const scheduleData of data) {
      if (scheduleData.workflow_deployed === false) {
        continue;
      }

      const recoveryDecision = shouldRecoverMissedDispatch(scheduleData, nowMs);

      if (recoveryDecision.recover) {
        console.log(
          `🛠️ Recovering missed schedule ${scheduleData.id} (${recoveryDecision.ageMinutes}m late)`,
        );
        await executeWorkflowDispatch(scheduleData);
        continue;
      }

      if (recoveryDecision.reason === "future") {
        scheduleJob(scheduleData);
        continue;
      }

      if (recoveryDecision.reason === "invalid_time") {
        console.log(
          `⚠️ Schedule ${scheduleData.id} has invalid push_time, skipping`,
        );
        continue;
      }

      if (recoveryDecision.reason === "too_old") {
        console.log(`⚠️ Schedule ${scheduleData.id} is in the past, skipping`);
      }
    }

    return data;
  } catch (error) {
    console.error("❌ Error loading schedules:", error);
    return [];
  }
};

/**
 * Cancel a scheduled job
 */
const cancelJob = (scheduleId) => {
  if (activeJobs.has(scheduleId)) {
    activeJobs.get(scheduleId).cancel();
    activeJobs.delete(scheduleId);
    console.log(`🚫 Cancelled job for schedule ${scheduleId}`);
    return true;
  }
  return false;
};

/**
 * Get all active jobs
 */
const getActiveJobs = () => {
  return Array.from(activeJobs.keys());
};

module.exports = {
  executeWorkflowDispatch,
  scheduleJob,
  loadSchedules,
  cancelJob,
  getActiveJobs,
};
