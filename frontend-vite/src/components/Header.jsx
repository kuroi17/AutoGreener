import React from "react";
import { Link, useLocation } from "react-router-dom";

const Header = ({ title, subtitle }) => {
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const isAddSchedule = location.pathname === "/add";

  return (
    <div className="mb-8">
      {!isDashboard && !isAddSchedule && (
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
      )}
      <h1 className="text-4xl font-bold text-gray-800 mb-2">{title}</h1>
      <p className="text-gray-600">{subtitle}</p>
    </div>
  );
};

export default Header;
