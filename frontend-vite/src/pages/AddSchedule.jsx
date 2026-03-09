import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AddRepoForm from "../components/AddRepoForm";
import Notification from "../components/Notification";
import { scheduleAPI } from "../services/api";

const AddSchedule = () => {
  const navigate = useNavigate();
  const [notification, setNotification] = useState({
    show: false,
    type: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);

      // Transform frontend data format to backend format
      const scheduleData = {
        repo_path: formData.repoPath,
        branch: formData.branch,
        push_time: formData.pushTime,
      };

      const response = await scheduleAPI.create(scheduleData);

      if (response.success) {
        setNotification({
          show: true,
          type: "success",
          message: `Push scheduled successfully for ${formData.branch} at ${formData.pushTime}`,
        });

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (error) {
      console.error("Error creating schedule:", error);
      setNotification({
        show: true,
        type: "error",
        message: "Failed to schedule push. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="container mx-auto px-6 py-8">
        {/* Notification */}
        {notification.show && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification({ ...notification, show: false })}
          />
        )}

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-800 flex items-center transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Schedule New Push
          </h1>
          <p className="text-gray-600">
            Configure your repository and push timing
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-blue-900 font-semibold mb-1">How it works</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Enter the full path to your local Git repository</li>
                <li>• Select the branch you want to push</li>
                <li>• Choose the date and time for the scheduled push</li>
                <li>
                  • Our scheduler will automatically push at the specified time
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form */}
        <AddRepoForm onSubmit={handleSubmit} />

        {/* Tips Section */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <svg
              className="w-6 h-6 mr-2 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Pro Tips
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                Make sure your repository has commits ready to push before
                scheduling
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>The branch must exist in your local repository</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                Schedule multiple pushes to maintain consistent GitHub activity
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                Your computer must be running at the scheduled time for the push
                to execute
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AddSchedule;
