const GitHubService = require("./githubService");
const { generateWorkflowConfig } = require("./workflowGenerator");

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
      const branch =
        schedule.branch ||
        schedule.source_branch ||
        schedule.target_branch ||
        null;

      // Validate repo access and choose an effective branch.
      const repoInfo = await githubService.getRepository(owner, repo);
      const effectiveBranch = branch || repoInfo.default_branch;

      if (!effectiveBranch) {
        throw new Error("No valid branch found for workflow deployment");
      }

      // Generate workflow configuration using effective branch.
      const workflowConfig = generateWorkflowConfig({
        ...schedule,
        branch: effectiveBranch,
      });

      const path = workflowConfig.filePath;

      // Check if workflow file already exists
      const existingFile = await githubService.getFileContent(
        owner,
        repo,
        path,
        effectiveBranch,
      );

      const commitMessage = existingFile
        ? `Update PushClock schedule ${schedule.id} workflow`
        : `Add PushClock schedule ${schedule.id} workflow`;

      // Create or update workflow file
      const result = await githubService.createOrUpdateFile(
        owner,
        repo,
        path,
        workflowConfig.content,
        commitMessage,
        effectiveBranch,
        existingFile?.sha || null,
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
      const branch =
        schedule.branch ||
        schedule.source_branch ||
        schedule.target_branch ||
        null;

      const repoInfo = await githubService.getRepository(owner, repo);
      const effectiveBranch = branch || repoInfo.default_branch;

      // Get existing file to retrieve SHA
      const existingFile = await githubService.getFileContent(
        owner,
        repo,
        path,
        effectiveBranch,
      );

      if (!existingFile) {
        return {
          success: true,
          message: "Workflow file does not exist",
          action: "skipped",
        };
      }

      const commitMessage = `Remove PushClock schedule ${schedule.id} workflow`;

      // Delete workflow file
      const result = await githubService.deleteFile(
        owner,
        repo,
        path,
        commitMessage,
        effectiveBranch,
        existingFile.sha,
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
      const branch =
        schedule.branch ||
        schedule.source_branch ||
        schedule.target_branch ||
        null;

      const repoInfo = await githubService.getRepository(owner, repo);
      const effectiveBranch = branch || repoInfo.default_branch;

      const existingFile = await githubService.getFileContent(
        owner,
        repo,
        path,
        effectiveBranch,
      );

      return existingFile !== null;
    } catch (error) {
      console.error("Error checking workflow existence:", error);
      return false;
    }
  }
}

module.exports = WorkflowService;
