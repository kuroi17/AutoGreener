const supabase = require("../config/supabase");
const WorkflowService = require("../services/workflowService");

const normalizeSchedule = (item) => {
  if (!item) return item;

  return {
    ...item,
    branch: item.branch || item.source_branch || item.target_branch || null,
    push_count: item.push_count || 1,
  };
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ensureValidScheduleId = (id, res) => {
  if (!UUID_REGEX.test(String(id || ""))) {
    res.status(400).json({
      success: false,
      message: "Invalid schedule id",
    });
    return false;
  }

  return true;
};

const ensureSchedulablePushTime = (pushTime, res) => {
  const scheduledDate = new Date(pushTime);

  if (Number.isNaN(scheduledDate.getTime())) {
    res.status(400).json({
      success: false,
      message: "Invalid push_time format",
    });
    return false;
  }

  // Allow any valid future or past time — the workflow_dispatch trigger lets
  // users run the workflow manually regardless of the scheduled cron time.
  return true;
};

// GET all schedules
const getAllSchedules = async (req, res) => {
  try {
    // Get schedules for the authenticated user only
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", userId)
      .order("push_time", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: (data || []).map(normalizeSchedule),
      count: data ? data.length : 0,
    });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch schedules",
      error: error.message,
    });
  }
};

// GET single schedule by ID
const getScheduleById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!ensureValidScheduleId(id, res)) {
    return;
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    res.json({
      success: true,
      data: normalizeSchedule(data),
    });
  } catch (error) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch schedule",
      error: error.message,
    });
  }
};

// POST create new schedule
const createSchedule = async (req, res) => {
  const {
    repo_path,
    branch,
    push_time,
    github_repo_url,
    repo_owner,
    repo_name,
    commit_message,
    push_count,
  } = req.body;
  const userId = req.user?.id;

  // Validation
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  if (!branch || !push_time) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: branch, push_time",
    });
  }

  if (!ensureSchedulablePushTime(push_time, res)) {
    return;
  }

  // Require either repo_path (legacy) or github repo details
  if (!repo_path && (!github_repo_url || !repo_owner || !repo_name)) {
    return res.status(400).json({
      success: false,
      message:
        "Either repo_path or github_repo_url/repo_owner/repo_name is required",
    });
  }

  try {
    const normalizedRepoPath =
      repo_path ||
      (repo_owner && repo_name ? `${repo_owner}/${repo_name}` : null);

    const defaultCommitMessage =
      commit_message || "Automated push by AutoGreener";
    const normalizedPushCount = Math.min(
      Math.max(Number(push_count) || 1, 1),
      20,
    );

    // Map incoming `branch` to DB `source_branch` to match existing schema.
    const baseScheduleData = {
      user_id: userId,
      repo_path: normalizedRepoPath,
      source_branch: branch,
      push_time,
      status: "scheduled",
      commit_message: defaultCommitMessage,
      push_count: normalizedPushCount,
    };

    const scheduleDataWithGithub = {
      ...baseScheduleData,
      github_repo_url,
      repo_owner,
      repo_name,
    };

    const scheduleInsertVariants = [
      scheduleDataWithGithub,
      (() => {
        const {
          commit_message: _omit,
          push_count: _omitPushCount,
          ...rest
        } = scheduleDataWithGithub;
        return rest;
      })(),
      baseScheduleData,
      (() => {
        const {
          commit_message: _omit,
          push_count: _omitPushCount,
          ...rest
        } = baseScheduleData;
        return rest;
      })(),
    ];

    let data = null;
    let insertError = null;

    for (const payload of scheduleInsertVariants) {
      // Try progressively simpler payloads for compatibility with older DB schemas.
      const { data: inserted, error } = await supabase
        .from("schedules")
        .insert([payload])
        .select()
        .single();

      if (!error) {
        data = inserted;
        insertError = null;
        break;
      }

      insertError = error;
    }

    if (insertError) {
      throw insertError;
    }

    // Normalize returned data shape for frontend compatibility: older
    // frontend expects `branch` property. Ensure `branch` is present
    // by mapping from `source_branch` (or `target_branch` if present).
    if (data) {
      data = normalizeSchedule(data);
    }

    // Deploy workflow to GitHub if repo details are provided
    let workflowDeployed = false;
    let workflowResult = null;

    if (github_repo_url && repo_owner && repo_name && req.user.access_token) {
      try {
        workflowResult = await WorkflowService.deployWorkflow(
          req.user.access_token,
          data,
        );

        // Update schedule with workflow deployment status
        await supabase
          .from("schedules")
          .update({
            status: "scheduled",
            workflow_deployed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);

        workflowDeployed = true;
        data.workflow_deployed = true;
        data.status = "scheduled";
      } catch (workflowError) {
        console.error("Error deploying workflow:", workflowError);
        // Schedule created but workflow failed - don't fail the entire request
        workflowResult = {
          error: workflowError.message,
          success: false,
        };
      }
    }

    res.status(201).json({
      success: true,
      message: "Schedule created successfully",
      data,
      workflow: workflowDeployed
        ? {
            deployed: true,
            ...workflowResult,
          }
        : {
            deployed: false,
            message:
              workflowResult?.error || "GitHub repo details not provided",
          },
    });
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create schedule",
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
};

// PUT update schedule
const updateSchedule = async (req, res) => {
  const { id } = req.params;
  const {
    repo_path,
    branch,
    push_time,
    status,
    github_repo_url,
    repo_owner,
    repo_name,
    commit_message,
    push_count,
  } = req.body;
  const userId = req.user?.id;

  if (!ensureValidScheduleId(id, res)) {
    return;
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    if (push_time && !ensureSchedulablePushTime(push_time, res)) {
      return;
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (repo_path !== undefined) updateData.repo_path = repo_path;
    if (branch) updateData.source_branch = branch;
    if (push_time) updateData.push_time = push_time;
    if (status) updateData.status = status;
    if (github_repo_url) updateData.github_repo_url = github_repo_url;
    if (repo_owner) updateData.repo_owner = repo_owner;
    if (repo_name) updateData.repo_name = repo_name;
    if (commit_message !== undefined)
      updateData.commit_message = commit_message;
    if (push_count !== undefined) {
      updateData.push_count = Math.min(
        Math.max(Number(push_count) || 1, 1),
        20,
      );
    }

    let queryResult = await supabase
      .from("schedules")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (
      queryResult.error &&
      push_count !== undefined &&
      /push_count/i.test(queryResult.error.message || "")
    ) {
      const { push_count: _omitPushCount, ...fallbackUpdateData } = updateData;
      queryResult = await supabase
        .from("schedules")
        .update(fallbackUpdateData)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();
    }

    const { data, error } = queryResult;

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // If schedule has GitHub repo and workflow is deployed, redeploy with updated settings
    let workflowRedeployed = false;
    if (
      data.workflow_deployed &&
      data.repo_owner &&
      data.repo_name &&
      req.user.access_token &&
      (branch || push_time || commit_message || push_count !== undefined)
    ) {
      try {
        await WorkflowService.deployWorkflow(req.user.access_token, data);
        workflowRedeployed = true;
      } catch (workflowError) {
        console.error("Error redeploying workflow:", workflowError);
        // Don't fail the update if workflow deployment fails
      }
    }

    res.json({
      success: true,
      message: "Schedule updated successfully",
      data,
      workflow: workflowRedeployed
        ? { redeployed: true }
        : { redeployed: false },
    });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update schedule",
      error: error.message,
    });
  }
};

// PUT toggle schedule status (active <-> paused)
const toggleScheduleStatus = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!ensureValidScheduleId(id, res)) {
    return;
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    // Get current schedule
    const { data: schedule, error: fetchError } = await supabase
      .from("schedules")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // Toggle status
    const newStatus = schedule.status === "paused" ? "scheduled" : "paused";

    const { data, error } = await supabase
      .from("schedules")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: `Schedule ${newStatus === "active" ? "activated" : "paused"} successfully`,
      data,
    });
  } catch (error) {
    console.error("Error toggling schedule status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle schedule status",
      error: error.message,
    });
  }
};

// DELETE schedule
const deleteSchedule = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!ensureValidScheduleId(id, res)) {
    return;
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    res.json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete schedule",
      error: error.message,
    });
  }
};

module.exports = {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  toggleScheduleStatus,
  deleteSchedule,
  syncScheduleStatuses: async (req, res) => {
    const userId = req.user?.id;
    const accessToken = req.user?.access_token;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "GitHub access token not found",
      });
    }

    try {
      const fetchSchedules = async (includeWorkflowFilter) => {
        let query = supabase
          .from("schedules")
          .select("*")
          .eq("user_id", userId)
          .in("status", ["scheduled", "active", "in-progress"]);

        if (includeWorkflowFilter) {
          query = query.eq("workflow_deployed", true);
        }

        return query;
      };

      let { data: schedules, error } = await fetchSchedules(true);

      // Backward compatibility for older DB schemas that don't have workflow_deployed.
      if (error && /workflow_deployed/i.test(error.message || "")) {
        const fallbackResult = await fetchSchedules(false);
        schedules = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;

      const syncCandidates = (schedules || []).filter((schedule) => {
        if (typeof schedule.workflow_deployed === "boolean") {
          return schedule.workflow_deployed;
        }

        // If schema is older, sync only records with repo metadata.
        return Boolean(schedule.repo_owner && schedule.repo_name);
      });

      const now = new Date();
      let updatedCount = 0;

      for (const schedule of syncCandidates) {
        const scheduleTime = new Date(schedule.push_time);

        // Ignore schedules far in the future.
        if (scheduleTime.getTime() - now.getTime() > 15 * 60 * 1000) {
          continue;
        }

        const synced = await WorkflowService.syncScheduleStatus(
          accessToken,
          normalizeSchedule(schedule),
        );

        if (
          synced.status !== schedule.status ||
          (synced.error_message || null) !== (schedule.error_message || null)
        ) {
          const { error: updateError } = await supabase
            .from("schedules")
            .update({
              status: synced.status,
              error_message: synced.error_message,
              updated_at: new Date().toISOString(),
            })
            .eq("id", schedule.id)
            .eq("user_id", userId);

          if (!updateError) {
            updatedCount += 1;
          }
        }
      }

      return res.json({
        success: true,
        checked: syncCandidates.length,
        updated: updatedCount,
      });
    } catch (syncError) {
      console.error("Error syncing schedule statuses:", syncError);
      return res.status(500).json({
        success: false,
        message: "Failed to sync schedule statuses",
        error: syncError.message,
      });
    }
  },
};
