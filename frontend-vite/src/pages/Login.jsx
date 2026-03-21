import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { Clock3, Github, Leaf, ShieldCheck } from "lucide-react";

const Login = () => {
  const { login, authenticated, loading } = useAuth();

  // If already authenticated, redirect to dashboard
  if (authenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-lime-50 to-white">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-lime-50 to-white px-4">
      <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/45 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mb-3 flex justify-center">
            <div className="rounded-2xl bg-emerald-600 p-4 text-white shadow-lg">
              <Leaf className="h-10 w-10" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-emerald-950">
            AutoGreener
          </h1>
          <p className="mt-2 text-sm text-emerald-800">
            Simple scheduling for steadier GitHub contribution streaks
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-7 shadow-xl">
          <h2 className="text-center text-xl font-bold text-emerald-950">
            Continue with GitHub
          </h2>
          <p className="mb-6 mt-2 text-center text-sm text-emerald-800">
            Sign in once, then schedule your pushes in a lightweight dashboard.
          </p>

          <button
            onClick={login}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Github className="h-5 w-5" />
            Continue with GitHub
          </button>

          <div className="mt-6 grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-900">
            <p className="font-semibold">Included</p>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Precise schedule controls
            </div>
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Contribution streak support
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              OAuth-based authenticated access
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-emerald-700">
            By signing in, you allow AutoGreener to access your GitHub
            repositories through the configured OAuth app.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-emerald-700">
          Keep it lightweight. Keep it consistent.
        </p>
      </div>
    </div>
  );
};

export default Login;
