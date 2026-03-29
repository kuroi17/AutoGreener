const schedule = require("node-schedule");
const supabase = require("../config/supabase");
const WorkflowService = require("./workflowService");

// Store active jobs in memory
const activeJobs = new Map();

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

    data.forEach((scheduleData) => {
      if (scheduleData.workflow_deployed === false) {
        return;
      }
      scheduleJob(scheduleData);
    });

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
