import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Workflow API Service
 * Handles all workflow-related API calls
 */
const workflowAPI = {
  /**
   * Deploy workflow to GitHub repository
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<Object>} Deployment result
   */
  deploy: async (scheduleId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/workflow/deploy/${scheduleId}`,
        {},
        {
          withCredentials: true,
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error deploying workflow:", error);
      throw new Error(
        error.response?.data?.message || "Failed to deploy workflow",
      );
    }
  },

  /**
   * Remove workflow from GitHub repository
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<Object>} Removal result
   */
  remove: async (scheduleId) => {
    try {
      const response = await axios.delete(
        `${API_URL}/api/workflow/remove/${scheduleId}`,
        {
          withCredentials: true,
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error removing workflow:", error);
      throw new Error(
        error.response?.data?.message || "Failed to remove workflow",
      );
    }
  },

  /**
   * Check workflow deployment status
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<Object>} Status information
   */
  checkStatus: async (scheduleId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/workflow/status/${scheduleId}`,
        {
          withCredentials: true,
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error checking workflow status:", error);
      throw new Error(
        error.response?.data?.message || "Failed to check workflow status",
      );
    }
  },
};

export default workflowAPI;
