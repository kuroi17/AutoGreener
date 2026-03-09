const express = require("express");
const router = express.Router();
const WorkflowService = require("../services/workflowService");
const { isAuthenticated } = require("../middleware/auth");
const supabase = require("../config/supabase");

/**
 * POST /api/workflow/deploy/:scheduleId
 * Deploy workflow file to GitHub repository
 */
router.post("/deploy/:scheduleId", isAuthenticated, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const accessToken = req.user.access_token;
    const userId = req.user.id;

    if (!accessToken) {
      return res.status(401).json({ error: "GitHub access token not found" });
    }

    // Fetch schedule from database
    const { data: schedule, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("id", scheduleId)
      .eq("user_id", userId)
      .single();

    if (error || !schedule) {
      return res.status(404).json({
        success: false,
        error: "Schedule not found",
      });
    }

    // Ensure schedule has GitHub repo details
    if (!schedule.repo_owner || !schedule.repo_name) {
      return res.status(400).json({
        success: false,
        error: "Schedule must have GitHub repository details",
      });
    }

    // Deploy workflow
    const result = await WorkflowService.deployWorkflow(accessToken, schedule);

    // Update schedule status to indicate workflow deployed
    await supabase
      .from("schedules")
      .update({
        status: "active",
        workflow_deployed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduleId);

    res.json({
      success: true,
      message: `Workflow ${result.action} successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error deploying workflow:", error);
    res.status(500).json({
      success: false,
      error: "Failed to deploy workflow",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/workflow/remove/:scheduleId
 * Remove workflow file from GitHub repository
 */
router.delete("/remove/:scheduleId", isAuthenticated, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const accessToken = req.user.access_token;
    const userId = req.user.id;

    if (!accessToken) {
      return res.status(401).json({ error: "GitHub access token not found" });
    }

    // Fetch schedule from database
    const { data: schedule, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("id", scheduleId)
      .eq("user_id", userId)
      .single();

    if (error || !schedule) {
      return res.status(404).json({
        success: false,
        error: "Schedule not found",
      });
    }

    // Remove workflow
    const result = await WorkflowService.removeWorkflow(accessToken, schedule);

    // Update schedule status
    await supabase
      .from("schedules")
      .update({
        workflow_deployed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduleId);

    res.json({
      success: true,
      message: `Workflow ${result.action} successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error removing workflow:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove workflow",
      message: error.message,
    });
  }
});

/**
 * GET /api/workflow/status/:scheduleId
 * Check if workflow file exists in repository
 */
router.get("/status/:scheduleId", isAuthenticated, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const accessToken = req.user.access_token;
    const userId = req.user.id;

    if (!accessToken) {
      return res.status(401).json({ error: "GitHub access token not found" });
    }

    // Fetch schedule from database
    const { data: schedule, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("id", scheduleId)
      .eq("user_id", userId)
      .single();

    if (error || !schedule) {
      return res.status(404).json({
        success: false,
        error: "Schedule not found",
      });
    }

    // Check workflow existence
    const exists = await WorkflowService.workflowExists(accessToken, schedule);

    res.json({
      success: true,
      scheduleId,
      workflowDeployed: exists,
      workflowPath: `.github/workflows/pushclock-schedule-${scheduleId}.yml`,
    });
  } catch (error) {
    console.error("Error checking workflow status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check workflow status",
      message: error.message,
    });
  }
});

module.exports = router;
