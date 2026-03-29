import React from "react";
import { CalendarClock, GitBranch, Trash2 } from "lucide-react";

const ScheduleCard = ({
  schedule,
  rowActionId,
  isWorkflowDeployed,
  formatDateTime,
  getStatusClassName,
  onWorkflowSetup,
  onDelete,
}) => {
  const displayRepo =
    schedule.repo_owner && schedule.repo_name
      ? `${schedule.repo_owner}/${schedule.repo_name}`
      : schedule.repo_path || "Unknown repository";

  return (
    <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a
            href={schedule.github_repo_url || "#"}
            target={schedule.github_repo_url ? "_blank" : undefined}
            rel="noreferrer"
            className="font-semibold text-emerald-950 hover:text-emerald-700"
          >
            {displayRepo}
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-emerald-800">
            <span className="flex items-center gap-1">
              <GitBranch className="h-4 w-4" />
              {schedule.branch}
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              x{schedule.push_count || 1} pushes
            </span>
            <span className="flex items-center gap-1">
              <CalendarClock className="h-4 w-4" />
              {formatDateTime(schedule.push_time)}
            </span>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClassName(schedule.status)}`}
        >
          {schedule.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 xl:flex-nowrap">
        {!isWorkflowDeployed && (
          <button
            onClick={() => onWorkflowSetup(schedule)}
            disabled={rowActionId === schedule.id}
            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            title="Retries automatic setup when workflow deployment failed"
          >
            Retry workflow setup
          </button>
        )}

        <button
          onClick={() => onDelete(schedule.id)}
          disabled={rowActionId === schedule.id}
          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </article>
  );
};

export default ScheduleCard;
