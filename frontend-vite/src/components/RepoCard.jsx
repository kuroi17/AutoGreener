import React, { useState } from "react";
import workflowAPI from "../services/workflow";
import { scheduleAPI } from "../services/api";
import EditScheduleModal from "./EditScheduleModal";

const RepoCard = ({ schedule, onDelete, onUpdate }) => {
  // schedule object expected: { id, repo_owner, repo_name, github_repo_url, branch, pushTime, status, workflow_deployed }
  const [deploying, setDeploying] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      completed: "bg-green-100 text-green-800 border-green-300",
      failed: "bg-red-100 text-red-800 border-red-300",
      scheduled: "bg-blue-100 text-blue-800 border-blue-300",
      active: "bg-purple-100 text-purple-800 border-purple-300",
      paused: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return colors[status] || colors.scheduled;
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Display GitHub repo name or fall back to legacy repo_path
  const displayName =
    schedule?.repo_owner && schedule?.repo_name
      ? `${schedule.repo_owner}/${schedule.repo_name}`
      : schedule?.repo_path || "/path/to/repository";

  const handleDeployWorkflow = async () => {
    try {
      setDeploying(true);
      const result = await workflowAPI.deploy(schedule.id);

      if (result.success) {
        alert(
          `Workflow ${result.data.action} successfully!\n\nFile: ${result.data.workflow.filePath}`,
        );
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error deploying workflow:", error);
      alert(`Failed to deploy workflow: ${error.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleRemoveWorkflow = async () => {
    if (
      !confirm("Are you sure you want to remove the workflow file from GitHub?")
    ) {
      return;
    }

    try {
      setDeploying(true);
      const result = await workflowAPI.remove(schedule.id);

      if (result.success) {
        alert(`Workflow ${result.data.action} successfully!`);
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error removing workflow:", error);
      alert(`Failed to remove workflow: ${error.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      if (onDelete) onDelete(schedule.id);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setToggling(true);
      const result = await scheduleAPI.toggleStatus(schedule.id);

      if (result.success) {
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error toggling schedule status:", error);
      alert(`Failed to toggle status: ${error.message}`);
    } finally {
      setToggling(false);
    }
  };

  const handleViewWorkflow = () => {
    if (schedule?.repo_owner && schedule?.repo_name) {
      const workflowUrl = `https://github.com/${schedule.repo_owner}/${schedule.repo_name}/blob/${schedule.branch || "main"}/.github/workflows/pushclock-schedule-${schedule.id}.yml`;
      window.open(workflowUrl, "_blank");
    }
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clipRule="evenodd"
              />
            </svg>
            {schedule?.github_repo_url ? (
              <a
                href={schedule.github_repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors"
              >
                {displayName}
              </a>
            ) : (
              displayName
            )}
          </h3>
          <p className="text-sm text-gray-600 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01"
              />
            </svg>
            Branch:{" "}
            <span className="font-semibold ml-1">
              {schedule?.branch || "main"}
            </span>
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(schedule?.status || "scheduled")}`}
        >
          {schedule?.status || "Scheduled"}
        </span>
      </div>

      {/* Workflow Status */}
      {schedule?.repo_owner && schedule?.repo_name && (
        <div className="mb-3">
          <div className="flex items-center gap-2">
            {schedule?.workflow_deployed ? (
              <>
                <span className="flex items-center text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Workflow Deployed
                </span>
                <button
                  onClick={handleViewWorkflow}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                  title="View workflow in GitHub"
                >
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  View
                </button>
              </>
            ) : (
              <span className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                No Workflow
              </span>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-700">
            <svg
              className="w-5 h-5 mr-2 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">
              {formatDateTime(schedule?.pushTime || new Date())}
            </span>
          </div>
          <div className="flex space-x-2">
            {/* Toggle Status Button (Play/Pause) */}
            {schedule?.workflow_deployed && (
              <button
                onClick={handleToggleStatus}
                disabled={toggling}
                className={`p-2 rounded-lg transition-colors duration-200 disabled:opacity-50 ${
                  schedule?.status === "paused"
                    ? "text-green-600 hover:bg-green-50"
                    : "text-yellow-600 hover:bg-yellow-50"
                }`}
                title={
                  schedule?.status === "paused"
                    ? "Resume Schedule"
                    : "Pause Schedule"
                }
              >
                {toggling ? (
                  <svg
                    className="w-5 h-5 animate-spin"
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
                ) : schedule?.status === "paused" ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            )}

            {/* Deploy/Remove Workflow Button */}
            {schedule?.repo_owner &&
              schedule?.repo_name &&
              (schedule?.workflow_deployed ? (
                <button
                  onClick={handleRemoveWorkflow}
                  disabled={deploying}
                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  title="Remove Workflow"
                >
                  {deploying ? (
                    <svg
                      className="w-5 h-5 animate-spin"
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
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleDeployWorkflow}
                  disabled={deploying}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  title="Deploy Workflow"
                >
                  {deploying ? (
                    <svg
                      className="w-5 h-5 animate-spin"
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
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  )}
                </button>
              ))}

            {/* Edit Button */}
            <button
              onClick={handleEdit}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              title="Edit Schedule"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>

            {/* Delete Button */}
            <button
              onClick={handleDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
              title="Delete Schedule"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Schedule Modal */}
      <EditScheduleModal
        schedule={schedule}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={onUpdate}
      />
    </div>
  );
};

export default RepoCard;
