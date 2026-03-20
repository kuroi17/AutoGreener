import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Leaf, LogOut, User } from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="container mx-auto px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-emerald-900">
            <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-sm">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight">
                AutoGreener
              </p>
              <p className="text-xs text-emerald-700">
                Lightweight contribution scheduler
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {/* User Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 rounded-lg border border-emerald-100 px-3 py-2 text-emerald-900 transition-colors hover:bg-emerald-50"
                >
                  <img
                    src={
                      user.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
                    }
                    alt={user.username}
                    className="h-8 w-8 rounded-full border-2 border-emerald-200"
                  />
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.username}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-emerald-100 bg-white py-2 shadow-lg">
                    <div className="border-b border-emerald-100 px-4 py-3">
                      <p className="text-xs text-emerald-700">Signed in as</p>
                      <p className="truncate text-sm font-semibold text-emerald-950">
                        {user.username}
                      </p>
                    </div>
                    <div className="px-4 py-3 text-sm text-emerald-800">
                      <p className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        GitHub session active
                      </p>
                    </div>
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
