const express = require("express");
const router = express.Router();
const GitHubService = require("../services/githubService");
const { isAuthenticated } = require("../middleware/auth");

/**
 * GET /api/github/repos
 * Fetch all repositories accessible by the authenticated user
 */
router.get("/repos", isAuthenticated, async (req, res) => {
  try {
    // Get user's access token from session
    const accessToken = req.user.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: "GitHub access token not found" });
    }

    // Create GitHub service instance with user's token
    const githubService = new GitHubService(accessToken);

    // Fetch repositories
    const repos = await githubService.getUserRepositories({
      sort: req.query.sort || "updated",
      per_page: req.query.per_page || 100,
      page: req.query.page || 1,
    });

    res.json({
      success: true,
      count: repos.length,
      repositories: repos,
    });
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch repositories",
      message: error.message,
    });
  }
});

/**
 * GET /api/github/repos/:owner/:repo
 * Get details of a specific repository
 */
router.get("/repos/:owner/:repo", isAuthenticated, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const accessToken = req.user.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: "GitHub access token not found" });
    }

    const githubService = new GitHubService(accessToken);
    const repository = await githubService.getRepository(owner, repo);

    res.json({
      success: true,
      repository,
    });
  } catch (error) {
    console.error("Error fetching repository:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch repository",
      message: error.message,
    });
  }
});

/**
 * GET /api/github/repos/:owner/:repo/branches
 * Get branches for a specific repository
 */
router.get(
  "/repos/:owner/:repo/branches",
  isAuthenticated,
  async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const accessToken = req.user.access_token;

      if (!accessToken) {
        return res.status(401).json({ error: "GitHub access token not found" });
      }

      const githubService = new GitHubService(accessToken);
      const branches = await githubService.getBranches(owner, repo);

      res.json({
        success: true,
        count: branches.length,
        branches,
      });
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch branches",
        message: error.message,
      });
    }
  },
);

module.exports = router;
