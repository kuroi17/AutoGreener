const API_URL = import.meta.env.VITE_API_URL;

const authAPI = {
  // Get current user
  getCurrentUser: async () => {
    const response = await fetch(`${API_URL}/auth/user`, {
      credentials: "include", // Important: send cookies
    });
    if (!response.ok) {
      throw new Error("Not authenticated");
    }
    return response.json();
  },

  // Check auth status
  checkStatus: async () => {
    const response = await fetch(`${API_URL}/auth/status`, {
      credentials: "include",
    });
    return response.json();
  },

  // Logout
  logout: async () => {
    const response = await fetch(`${API_URL}/auth/logout`, {
      credentials: "include",
    });
    return response.json();
  },

  // Get GitHub login URL
  getGitHubLoginURL: () => {
    return `${API_URL}/auth/github`;
  },
};

export { authAPI, API_URL };
