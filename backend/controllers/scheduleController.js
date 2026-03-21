const supabase = require("../config/supabase");
const WorkflowService = require("../services/workflowService");

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
      data: data || [],
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
      data,
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

    const baseScheduleData = {
      user_id: userId,
      repo_path: normalizedRepoPath,
      branch,
      push_time,
      status: "scheduled",
      commit_message: defaultCommitMessage,
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
        const { commit_message: _omit, ...rest } = scheduleDataWithGithub;
        return rest;
      })(),
      baseScheduleData,
      (() => {
        const { commit_message: _omit, ...rest } = baseScheduleData;
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
            status: "active",
            workflow_deployed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);

        workflowDeployed = true;
        data.workflow_deployed = true;
        data.status = "active";
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
  } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (repo_path !== undefined) updateData.repo_path = repo_path;
    if (branch) updateData.branch = branch;
    if (push_time) updateData.push_time = push_time;
    if (status) updateData.status = status;
    if (github_repo_url) updateData.github_repo_url = github_repo_url;
    if (repo_owner) updateData.repo_owner = repo_owner;
    if (repo_name) updateData.repo_name = repo_name;
    if (commit_message !== undefined)
      updateData.commit_message = commit_message;

    const { data, error } = await supabase
      .from("schedules")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

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
      (branch || push_time || commit_message)
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
    const newStatus = schedule.status === "active" ? "paused" : "active";

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
};
