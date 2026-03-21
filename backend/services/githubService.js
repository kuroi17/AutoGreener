const axios = require("axios");

/**
 * GitHub Service - Handles all GitHub API interactions
 */
class GitHubService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.client = axios.create({
      baseURL: "https://api.github.com",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "PushClock-App",
      },
    });
  }

  /**
   * Fetch all repositories accessible by the authenticated user
   * Includes owned repos and repos where user has push access
   * @param {Object} options - Filtering options
   * @returns {Promise<Array>} List of repositories
   */
  async getUserRepositories(options = {}) {
    try {
      const { sort = "updated", per_page = 100, page = 1 } = options;

      const response = await this.client.get("/user/repos", {
        params: {
          sort,
          per_page,
          page,
          affiliation: "owner,collaborator", // Only repos where user can push
          visibility: "all", // Include both public and private repos
        },
      });

      // Filter repos where user has push permission
      const reposWithPushAccess = response.data.filter((repo) => {
        return repo.permissions && repo.permissions.push;
      });

      // Map to simplified structure
      return reposWithPushAccess.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        description: repo.description,
        default_branch: repo.default_branch,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
      }));
    } catch (error) {
      console.error(
        "Error fetching GitHub repositories:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to fetch GitHub repositories");
    }
  }

  /**
   * Get a specific repository by owner and repo name
   * @param {string} owner - Repository owner username
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Repository details
   */
  async getRepository(owner, repo) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}`);

      return {
        id: response.data.id,
        name: response.data.name,
        full_name: response.data.full_name,
        owner: response.data.owner.login,
        private: response.data.private,
        html_url: response.data.html_url,
        clone_url: response.data.clone_url,
        description: response.data.description,
        default_branch: response.data.default_branch,
        permissions: response.data.permissions,
      };
    } catch (error) {
      console.error(
        "Error fetching repository:",
        error.response?.data || error.message,
      );
      throw new Error("Repository not found or access denied");
    }
  }

  /**
   * Get branches for a specific repository
   * @param {string} owner - Repository owner username
   * @param {string} repo - Repository name
   * @returns {Promise<Array>} List of branches
   */
  async getBranches(owner, repo) {
    try {
      const response = await this.client.get(
        `/repos/${owner}/${repo}/branches`,
      );

      return response.data.map((branch) => ({
        name: branch.name,
        protected: branch.protected,
      }));
    } catch (error) {
      console.error(
        "Error fetching branches:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to fetch repository branches");
    }
  }

  /**
   * Get file content from repository
   * @param {string} owner - Repository owner username
   * @param {string} repo - Repository name
   * @param {string} path - File path in repository
   * @param {string} branch - Branch name (optional, defaults to default branch)
   * @returns {Promise<Object>} File metadata and content
   */
  async getFileContent(owner, repo, path, branch = null) {
    try {
      const params = branch ? { ref: branch } : {};
      const response = await this.client.get(
        `/repos/${owner}/${repo}/contents/${path}`,
        { params },
      );

      return {
        content: Buffer.from(response.data.content, "base64").toString("utf-8"),
        sha: response.data.sha,
        path: response.data.path,
        name: response.data.name,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // File doesn't exist
      }
      console.error(
        "Error fetching file content:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to fetch file content");
    }
  }

  /**
   * Create or update a file in repository
   * @param {string} owner - Repository owner username
   * @param {string} repo - Repository name
   * @param {string} path - File path in repository
   * @param {string} content - File content
   * @param {string} message - Commit message
   * @param {string} branch - Target branch
   * @param {string} sha - File SHA (required for updates, null for new files)
   * @returns {Promise<Object>} Commit information
   */
  async createOrUpdateFile(
    owner,
    repo,
    path,
    content,
    message,
    branch,
    sha = null,
  ) {
    try {
      const payload = {
        message,
        content: Buffer.from(content).toString("base64"),
      };

      // Only include branch if explicitly provided to avoid sending null
      // which can cause GitHub to return 404/Not Found.
      if (branch) payload.branch = branch;

      // Include SHA if updating existing file
      if (sha) {
        payload.sha = sha;
      }

      const response = await this.client.put(
        `/repos/${owner}/${repo}/contents/${path}`,
        payload,
      );

      return {
        success: true,
        commit: {
          sha: response.data.commit.sha,
          message: response.data.commit.message,
          url: response.data.commit.html_url,
        },
        content: {
          sha: response.data.content.sha,
          path: response.data.content.path,
          url: response.data.content.html_url,
        },
      };
    } catch (error) {
      console.error(
        "Error creating/updating file:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to ${sha ? "update" : "create"} file: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Delete a file from repository
   * @param {string} owner - Repository owner username
   * @param {string} repo - Repository name
   * @param {string} path - File path in repository
   * @param {string} message - Commit message
   * @param {string} branch - Target branch
   * @param {string} sha - File SHA (required)
   * @returns {Promise<Object>} Commit information
   */
  async deleteFile(owner, repo, path, message, branch, sha) {
    try {
      const data = { message, sha };
      if (branch) data.branch = branch;

      const response = await this.client.delete(
        `/repos/${owner}/${repo}/contents/${path}`,
        {
          data,
        },
      );

      return {
        success: true,
        commit: {
          sha: response.data.commit.sha,
          message: response.data.commit.message,
          url: response.data.commit.html_url,
        },
      };
    } catch (error) {
      console.error(
        "Error deleting file:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to delete file: ${error.response?.data?.message || error.message}`,
      );
    }
  }
}

module.exports = GitHubService;
