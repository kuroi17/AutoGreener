import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * GitHub API Service
 * Handles all GitHub-related API calls
 */
const githubAPI = {
  /**
   * Fetch user's GitHub repositories
   * @returns {Promise<Array>} List of repositories
   */
  getUserRepositories: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/github/repos`, {
        withCredentials: true,
      });

      return response.data.repositories || [];
    } catch (error) {
      console.error("Error fetching repositories:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch repositories",
      );
    }
  },

  /**
   * Get details of a specific repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Repository details
   */
  getRepository: async (owner, repo) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/github/repos/${owner}/${repo}`,
        {
          withCredentials: true,
        },
      );

      return response.data.repository;
    } catch (error) {
      console.error("Error fetching repository:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch repository",
      );
    }
  },

  /**
   * Get branches for a specific repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Array>} List of branches
   */
  getBranches: async (owner, repo) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/github/repos/${owner}/${repo}/branches`,
        {
          withCredentials: true,
        },
      );

      return response.data.branches || [];
    } catch (error) {
      console.error("Error fetching branches:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch branches",
      );
    }
  },
};

export default githubAPI;
