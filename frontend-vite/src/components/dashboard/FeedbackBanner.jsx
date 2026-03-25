import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export default function FeedbackBanner({ feedback, onClose }) {
  if (!feedback?.show) return null;

  return (
    <div
      className={`mb-5 flex items-start justify-between rounded-xl border px-4 py-3 text-sm ${
        feedback.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : feedback.type === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      <p className="flex items-center gap-2 font-medium">
        {feedback.type === "success" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        {feedback.message}
      </p>
      <button onClick={onClose} className="text-current/70 hover:text-current">
        Close
      </button>
    </div>
  );
}
