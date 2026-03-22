const API_URL = import.meta.env.VITE_API_URL;

const parseErrorResponse = async (response, fallbackMessage) => {
  let payload = null;

  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (payload?.message || payload?.error) {
    const code = payload?.code ? ` [${payload.code}]` : "";
    throw new Error(
      `${payload.message || payload.error}${code}${payload?.hint ? ` - ${payload.hint}` : ""}`,
    );
  }

  throw new Error(fallbackMessage);
};

// Schedule API endpoints
const scheduleAPI = {
  // Get all schedules
  getAll: async () => {
    const response = await fetch(`${API_URL}/api/schedule`, {
      credentials: "include",
    });
    if (!response.ok) {
      await parseErrorResponse(response, "Failed to fetch schedules");
    }
    return response.json();
  },

  // Get single schedule by ID
  getById: async (id) => {
    const response = await fetch(`${API_URL}/api/schedule/${id}`, {
      credentials: "include",
    });
    if (!response.ok) {
      await parseErrorResponse(response, "Failed to fetch schedule");
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
      credentials: "include",
      body: JSON.stringify(scheduleData),
    });
    if (!response.ok) {
      await parseErrorResponse(response, "Failed to create schedule");
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
      credentials: "include",
      body: JSON.stringify(scheduleData),
    });
    if (!response.ok) {
      await parseErrorResponse(response, "Failed to update schedule");
    }
    return response.json();
  },

  // Toggle schedule status (active <-> paused)
  toggleStatus: async (id) => {
    const response = await fetch(`${API_URL}/api/schedule/${id}/toggle`, {
      method: "PUT",
      credentials: "include",
    });
    if (!response.ok) {
      await parseErrorResponse(response, "Failed to toggle schedule status");
    }
    return response.json();
  },

  // Delete schedule
  delete: async (id) => {
    const response = await fetch(`${API_URL}/api/schedule/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      await parseErrorResponse(response, "Failed to delete schedule");
    }
    return response.json();
  },

  // Sync schedule statuses with GitHub workflow runs
  syncStatus: async () => {
    const response = await fetch(`${API_URL}/api/schedule/sync-status`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      await parseErrorResponse(response, "Failed to sync schedule status");
    }
    return response.json();
  },
};

export { scheduleAPI, API_URL };
