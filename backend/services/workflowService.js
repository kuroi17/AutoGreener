const GitHubService = require("./githubService");
const {
  generateWorkflowConfig,
  getWorkflowFileName,
} = require("./workflowGenerator");

/**
 * Workflow Service - Manages GitHub Actions workflow files
 */
class WorkflowService {
  /**
   * Deploy workflow file to GitHub repository
   * @param {string} accessToken - User's GitHub access token
   * @param {Object} schedule - Schedule object from database
   * @returns {Promise<Object>} Deployment result
   */
  static async deployWorkflow(accessToken, schedule) {
    try {
      const githubService = new GitHubService(accessToken);
      const owner = schedule.repo_owner;
      const repo = schedule.repo_name;
      const executionBranch =
        schedule.branch ||
        schedule.source_branch ||
        schedule.target_branch ||
        null;

      // Fetch the owner's numeric user ID so we can build the correct
      // ID+username noreply email for contribution graph attribution.
      let ownerId = null;
      try {
        const authUser = await githubService.getAuthenticatedUser();
        ownerId = authUser.id;
      } catch (_) {
        // Non-fatal: fall back to old email format if ID fetch fails.
      }

      // Scheduled workflows are only picked up from the repository default branch.
      // Keep workflow files there while allowing commits to target executionBranch.
      const repoInfo = await githubService.getRepository(owner, repo);
      const workflowBranch = repoInfo.default_branch;
      const effectiveExecutionBranch =
        executionBranch || repoInfo.default_branch;

      if (!workflowBranch || !effectiveExecutionBranch) {
        throw new Error("No valid branch found for workflow deployment");
      }

      // Generate workflow configuration using execution branch for checkout/push.
      const workflowConfig = generateWorkflowConfig({
        ...schedule,
        branch: effectiveExecutionBranch,
      });

      const path = workflowConfig.filePath;

      // Check if workflow file already exists
      const existingFile = await githubService.getFileContent(
        owner,
        repo,
        path,
        workflowBranch,
      );

      const commitMessage = existingFile
        ? `Update PushClock schedule ${schedule.id} workflow`
        : `Add PushClock schedule ${schedule.id} workflow`;

      // Create or update workflow file — pass ownerId for correct noreply email.
      const result = await githubService.createOrUpdateFile(
        owner,
        repo,
        path,
        workflowConfig.content,
        commitMessage,
        workflowBranch,
        existingFile?.sha || null,
        ownerId,
      );

      return {
        success: true,
        workflow: {
          fileName: workflowConfig.fileName,
          filePath: workflowConfig.filePath,
          url: result.content.url,
        },
        commit: result.commit,
        action: existingFile ? "updated" : "created",
      };
    } catch (error) {
      console.error("Error deploying workflow:", error);
      throw new Error(`Failed to deploy workflow: ${error.message}`);
    }
  }

  /**
   * Remove workflow file from GitHub repository
   * @param {string} accessToken - User's GitHub access token
   * @param {Object} schedule - Schedule object from database
   * @returns {Promise<Object>} Deletion result
   */
  static async removeWorkflow(accessToken, schedule) {
    try {
      const githubService = new GitHubService(accessToken);

      const workflowConfig = generateWorkflowConfig(schedule);
      const owner = schedule.repo_owner;
      const repo = schedule.repo_name;
      const path = workflowConfig.filePath;
      const executionBranch =
        schedule.branch ||
        schedule.source_branch ||
        schedule.target_branch ||
        null;

      // Fetch the owner's numeric user ID for correct noreply email attribution.
      let ownerId = null;
      try {
        const authUser = await githubService.getAuthenticatedUser();
        ownerId = authUser.id;
      } catch (_) {
        // Non-fatal: fall back to old email format if ID fetch fails.
      }

      const repoInfo = await githubService.getRepository(owner, repo);
      const workflowBranch = repoInfo.default_branch;

      // Get existing file to retrieve SHA
      let existingFile = await githubService.getFileContent(
        owner,
        repo,
        path,
        workflowBranch,
      );

      // Backward compatibility: older deployments may have placed workflows
      // on non-default branches.
      let fileBranch = workflowBranch;
      if (
        !existingFile &&
        executionBranch &&
        executionBranch !== workflowBranch
      ) {
        existingFile = await githubService.getFileContent(
          owner,
          repo,
          path,
          executionBranch,
        );
        if (existingFile) {
          fileBranch = executionBranch;
        }
      }

      if (!existingFile) {
        return {
          success: true,
          message: "Workflow file does not exist",
          action: "skipped",
        };
      }

      const commitMessage = `Remove PushClock schedule ${schedule.id} workflow`;

      // Delete workflow file — pass ownerId for correct noreply email.
      const result = await githubService.deleteFile(
        owner,
        repo,
        path,
        commitMessage,
        fileBranch,
        existingFile.sha,
        ownerId,
      );

      return {
        success: true,
        workflow: {
          fileName: workflowConfig.fileName,
          filePath: workflowConfig.filePath,
        },
        commit: result.commit,
        action: "deleted",
      };
    } catch (error) {
      console.error("Error removing workflow:", error);
      throw new Error(`Failed to remove workflow: ${error.message}`);
    }
  }

  /**
   * Check if workflow file exists in repository
   * @param {string} accessToken - User's GitHub access token
   * @param {Object} schedule - Schedule object from database
   * @returns {Promise<boolean>} Whether workflow exists
   */
  static async workflowExists(accessToken, schedule) {
    try {
      const githubService = new GitHubService(accessToken);
      const workflowConfig = generateWorkflowConfig(schedule);

      const owner = schedule.repo_owner;
      const repo = schedule.repo_name;
      const path = workflowConfig.filePath;
      const executionBranch =
        schedule.branch ||
        schedule.source_branch ||
        schedule.target_branch ||
        null;

      const repoInfo = await githubService.getRepository(owner, repo);
      const workflowBranch = repoInfo.default_branch;

      let existingFile = await githubService.getFileContent(
        owner,
        repo,
        path,
        workflowBranch,
      );

      if (
        !existingFile &&
        executionBranch &&
        executionBranch !== workflowBranch
      ) {
        existingFile = await githubService.getFileContent(
          owner,
          repo,
          path,
          executionBranch,
        );
      }

      return existingFile !== null;
    } catch (error) {
      console.error("Error checking workflow existence:", error);
      return false;
    }
  }

  /**
   * Trigger a workflow_dispatch run for a deployed schedule workflow.
   * @param {string} accessToken - User's GitHub access token
   * @param {Object} schedule - Schedule object from database
   * @returns {Promise<{success:boolean, workflowId:string, ref:string}>}
   */
  static async dispatchWorkflow(accessToken, schedule) {
    try {
      const githubService = new GitHubService(accessToken);
      const owner = schedule.repo_owner;
      const repo = schedule.repo_name;

      if (!owner || !repo) {
        throw new Error("Missing repository details for workflow dispatch");
      }

      const repoInfo = await githubService.getRepository(owner, repo);
      const executionBranch =
        schedule.branch ||
        schedule.source_branch ||
        schedule.target_branch ||
        repoInfo.default_branch;

      const workflowId = getWorkflowFileName(schedule.id);
      await githubService.dispatchWorkflow(
        owner,
        repo,
        workflowId,
        executionBranch,
      );

      return {
        success: true,
        workflowId,
        ref: executionBranch,
      };
    } catch (error) {
      console.error("Error dispatching workflow:", error);
      throw new Error(`Failed to dispatch workflow: ${error.message}`);
    }
  }

  /**
   * Infer current schedule execution status from GitHub workflow runs.
   * @param {string} accessToken - User's GitHub access token
   * @param {Object} schedule - Schedule object from database
   * @returns {Promise<{status:string, error_message:string|null, source:string}>}
   */
  static async syncScheduleStatus(accessToken, schedule) {
    try {
      const githubService = new GitHubService(accessToken);
      const owner = schedule.repo_owner;
      const repo = schedule.repo_name;

      if (!owner || !repo) {
        return {
          status: schedule.status,
          error_message: null,
          source: "missing_repo",
        };
      }

      const workflowFileName = getWorkflowFileName(schedule.id);
      const workflowRuns = await githubService.getWorkflowRuns(
        owner,
        repo,
        workflowFileName,
        { per_page: 30 },
      );

      const expectedWorkflowName = `PushClock Schedule ${schedule.id}`;
      const matchingRuns = workflowRuns
        .filter((run) => run?.name === expectedWorkflowName)
        .sort(
          (a, b) =>
            new Date(b.created_at || b.run_started_at || 0).getTime() -
            new Date(a.created_at || a.run_started_at || 0).getTime(),
        );

      const latestRun = matchingRuns[0];
      const scheduledTime = new Date(schedule.push_time);
      const now = new Date();

      const runTimestamp = latestRun
        ? new Date(latestRun.created_at || latestRun.run_started_at || 0)
        : null;

      // Only consider a run relevant if it started AFTER the scheduled push_time.
      // Using a small negative leeway (5 min before) to account for GitHub Actions
      // scheduling the run slightly early, but NOT matching workflow file deployment
      // commits that happen well before the scheduled time.
      const RUN_MATCH_LEEWAY_MS = 5 * 60 * 1000;
      const isRelevantRun =
        runTimestamp &&
        runTimestamp.getTime() >= scheduledTime.getTime() - RUN_MATCH_LEEWAY_MS;

      // Additionally require the run to be a scheduled or workflow_dispatch event,
      // not a push event (which is triggered by workflow file deployment).
      const isScheduledOrManual =
        !latestRun ||
        latestRun.event === "schedule" ||
        latestRun.event === "workflow_dispatch";

      const resolvedRun =
        isRelevantRun && isScheduledOrManual ? latestRun : null;

      if (!resolvedRun) {
        // GitHub Actions scheduled runs can be delayed by up to 15-30 minutes.
        // Keep schedule as "scheduled" for a grace window before flagging as missing.
        const graceMs = 90 * 60 * 1000; // 90 minutes grace for delayed cron runs
        if (scheduledTime.getTime() + graceMs > now.getTime()) {
          return {
            status: "scheduled",
            error_message: null,
            source: "pending_run",
          };
        }

        return {
          status: "error",
          error_message: "No workflow run detected after schedule time",
          source: "missing_run",
        };
      }

      if (resolvedRun.status !== "completed") {
        return {
          status: "in-progress",
          error_message: null,
          source: "run_in_progress",
        };
      }

      if (resolvedRun.conclusion === "success") {
        return {
          status: "completed",
          error_message: null,
          source: "run_success",
        };
      }

      return {
        status: "error",
        error_message: `Workflow conclusion: ${resolvedRun.conclusion || "unknown"}`,
        source: "run_failed",
      };
    } catch (error) {
      console.error("Error syncing schedule status from workflow:", error);
      return {
        status: schedule.status,
        error_message: null,
        source: "sync_error",
      };
    }
  }
}

module.exports = WorkflowService;
