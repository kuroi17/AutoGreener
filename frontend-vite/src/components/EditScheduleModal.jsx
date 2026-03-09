import React, { useState, useEffect } from "react";
import { scheduleAPI } from "../services/api";

const EditScheduleModal = ({ schedule, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    branch: "",
    push_time: "",
    commit_message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (schedule && isOpen) {
      // Format datetime-local input value (remove timezone info)
      const pushTime = schedule.push_time || schedule.pushTime;
      const formattedTime = pushTime
        ? new Date(pushTime).toISOString().slice(0, 16)
        : "";

      setFormData({
        branch: schedule.branch || "",
        push_time: formattedTime,
        commit_message:
          schedule.commit_message || "Automated push by PushClock",
      });
      setError("");
    }
  }, [schedule, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const updateData = {
        branch: formData.branch,
        push_time: new Date(formData.push_time).toISOString(),
        commit_message: formData.commit_message,
      };

      const result = await scheduleAPI.update(schedule.id, updateData);

      if (result.success) {
        alert(
          `Schedule updated successfully!${result.workflow?.redeployed ? "\nWorkflow has been redeployed with new settings." : ""}`,
        );
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (err) {
      console.error("Error updating schedule:", err);
      setError(err.message || "Failed to update schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Schedule</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Repository Name (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repository
            </label>
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
              {schedule?.repo_owner && schedule?.repo_name
                ? `${schedule.repo_owner}/${schedule.repo_name}`
                : schedule?.repo_path || "Unknown"}
            </div>
          </div>

          {/* Branch */}
          <div>
            <label
              htmlFor="branch"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Branch <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="branch"
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="e.g., main"
            />
          </div>

          {/* Push Time */}
          <div>
            <label
              htmlFor="push_time"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Push Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="push_time"
              name="push_time"
              value={formData.push_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Commit Message */}
          <div>
            <label
              htmlFor="commit_message"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Commit Message
            </label>
            <input
              type="text"
              id="commit_message"
              name="commit_message"
              value={formData.commit_message}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Automated push by PushClock"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Updating...
                </span>
              ) : (
                "Update Schedule"
              )}
            </button>
          </div>

          {/* Info Note */}
          <p className="text-xs text-gray-500 mt-4">
            <svg
              className="w-4 h-4 inline mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Updating will automatically redeploy the workflow with new settings.
          </p>
        </form>
      </div>
    </div>
  );
};

export default EditScheduleModal;
