const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Schedule API endpoints
const scheduleAPI = {
  // Get all schedules
  getAll: async () => {
    const response = await fetch(`${API_URL}/api/schedule`);
    if (!response.ok) {
      throw new Error("Failed to fetch schedules");
    }
    return response.json();
  },

  // Get single schedule by ID
  getById: async (id) => {
    const response = await fetch(`${API_URL}/api/schedule/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch schedule");
    }
    return response.json();
  },

  // Create new schedule
  create: async (scheduleData) => {
    const response = await fetch(`${API_URL}/api/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scheduleData),
    });
    if (!response.ok) {
      throw new Error("Failed to create schedule");
    }
    return response.json();
  },

  // Update schedule
  update: async (id, scheduleData) => {
    const response = await fetch(`${API_URL}/api/schedule/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scheduleData),
    });
    if (!response.ok) {
      throw new Error("Failed to update schedule");
    }
    return response.json();
  },

  // Delete schedule
  delete: async (id) => {
    const response = await fetch(`${API_URL}/api/schedule/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete schedule");
    }
    return response.json();
  },
};

export { scheduleAPI, API_URL };
