import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Leaf,
  Loader2,
  Sparkles,
} from "lucide-react";
import ScheduleCard from "./ScheduleCard";

export default function SchedulesSection({
  fetchSchedules,
  isRefreshing,
  loadingSchedules,
  schedules,
  visibleSchedules,
  workflowStatusById,
  rowActionId,
  formatDateTime,
  getStatusClassName,
  onWorkflowToggle,
  onDelete,
  CARDS_PER_PAGE,
  totalSchedulePages,
  schedulePage,
  setSchedulePage,
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-emerald-950">
            Scheduled pushes
          </h2>
          <p className="text-xs text-emerald-700">
            Showing up to {CARDS_PER_PAGE} cards per page
          </p>
        </div>
        <button
          onClick={() => fetchSchedules()}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {loadingSchedules ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-emerald-700">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-8 text-center">
          <Leaf className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 font-semibold text-emerald-900">
            No schedules yet
          </p>
          <p className="text-sm text-emerald-700">
            Create your first schedule from the left panel.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visibleSchedules.map((schedule) => {
              const isWorkflowDeployed =
                typeof schedule.workflow_deployed === "boolean"
                  ? schedule.workflow_deployed
                  : Boolean(workflowStatusById[schedule.id]);

              return (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  rowActionId={rowActionId}
                  isWorkflowDeployed={isWorkflowDeployed}
                  formatDateTime={formatDateTime}
                  getStatusClassName={getStatusClassName}
                  onWorkflowToggle={onWorkflowToggle}
                  onDelete={onDelete}
                />
              );
            })}
          </div>

          {schedules.length > CARDS_PER_PAGE && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-100 bg-white px-3 py-2">
              <button
                type="button"
                onClick={() =>
                  setSchedulePage((previous) => Math.max(previous - 1, 0))
                }
                disabled={schedulePage <= 0}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1 text-sm text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSchedulePages }, (_, index) => (
                  <button
                    key={`schedule-page-${index + 1}`}
                    type="button"
                    onClick={() => setSchedulePage(index)}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      index === schedulePage
                        ? "bg-emerald-600"
                        : "bg-emerald-200 hover:bg-emerald-300"
                    }`}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setSchedulePage((previous) =>
                    Math.min(previous + 1, totalSchedulePages - 1),
                  )
                }
                disabled={schedulePage >= totalSchedulePages - 1}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1 text-sm text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
