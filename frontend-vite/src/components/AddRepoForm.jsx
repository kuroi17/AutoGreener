import React, { useState } from "react";

const AddRepoForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    repoPath: "",
    branch: "main",
    pushDate: "",
    pushTime: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBrowseFolder = async () => {
    try {
      // Check if the browser supports the File System Access API
      if ("showDirectoryPicker" in window) {
        const directoryHandle = await window.showDirectoryPicker();
        // Get the full path (note: web API doesn't provide full path for security)
        // We'll use the name for now
        setFormData((prev) => ({
          ...prev,
          repoPath: directoryHandle.name,
        }));
      } else {
        // Fallback: Alert user to manually enter path
        alert(
          "Your browser does not support folder selection. Please enter the path manually.",
        );
      }
    } catch (error) {
      // User cancelled the picker or an error occurred
      if (error.name !== "AbortError") {
        console.error("Error selecting folder:", error);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.repoPath.trim()) {
      newErrors.repoPath = "Repository path is required";
    }

    if (!formData.branch.trim()) {
      newErrors.branch = "Branch name is required";
    }

    if (!formData.pushDate) {
      newErrors.pushDate = "Push date is required";
    }

    if (!formData.pushTime) {
      newErrors.pushTime = "Push time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const pushDateTime = `${formData.pushDate}T${formData.pushTime}:00`;
      const submitData = {
        ...formData,
        pushTime: pushDateTime,
      };

      if (onSubmit) {
        onSubmit(submitData);
      }

      // Reset form
      setFormData({
        repoPath: "",
        branch: "main",
        pushDate: "",
        pushTime: "",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <svg
          className="w-7 h-7 mr-2 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Schedule New Push
      </h2>

      {/* Repository Path */}
      <div className="mb-6">
        <label
          htmlFor="repoPath"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Repository Path
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="repoPath"
            name="repoPath"
            value={formData.repoPath}
            onChange={handleChange}
            placeholder="C:\\Users\\YourName\\Projects\\my-repo"
            className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              errors.repoPath ? "border-red-500" : "border-gray-300"
            }`}
          />
          <button
            type="button"
            onClick={handleBrowseFolder}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors duration-200 font-medium text-gray-700 flex items-center gap-2"
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            Browse
          </button>
        </div>
        {errors.repoPath && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {errors.repoPath}
          </p>
        )}
      </div>

      {/* Branch Name */}
      <div className="mb-6">
        <label
          htmlFor="branch"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Branch Name
        </label>
        <input
          type="text"
          id="branch"
          name="branch"
          value={formData.branch}
          onChange={handleChange}
          placeholder="main"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
            errors.branch ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.branch && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {errors.branch}
          </p>
        )}
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label
            htmlFor="pushDate"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Push Date
          </label>
          <input
            type="date"
            id="pushDate"
            name="pushDate"
            value={formData.pushDate}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              errors.pushDate ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.pushDate && (
            <p className="mt-2 text-sm text-red-600">{errors.pushDate}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="pushTime"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Push Time
          </label>
          <input
            type="time"
            id="pushTime"
            name="pushTime"
            value={formData.pushTime}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              errors.pushTime ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.pushTime && (
            <p className="mt-2 text-sm text-red-600">{errors.pushTime}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl flex items-center gap-2"
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Schedule Push
        </button>
      </div>
    </form>
  );
};

export default AddRepoForm;
