import React from "react";
import { Loader2, Upload } from "lucide-react";
import RepoSelector from "./RepoSelector";
import DateTimeControls from "./DateTimeControls";
import PushesCommitSection from "./PushesCommitSection";
import StreakBuilderSection from "./StreakBuilderSection";

export default function CreateSchedulePanel({
  handleCreate,
  loadingRepos,
  repoQuery,
  onRepoQueryChange,
  selectedRepo,
  filteredRepos,
  onPickRepo,
  loadingBranches,
  branches,
  form,
  updateForm,
  earliestAllowedDateTime,
  minDateText,
  minTimeTextForSelectedDate,
  hasMinimumLeadTime,
  MIN_SCHEDULE_LEAD_MINUTES,
  clampIntegerString,
  updateCustomTime,
  removeCustomTime,
  addCustomTime,
  MAX_PUSHES_PER_DAY,
  STREAK_TEMPLATES,
  hasValidTemplateRange,
  isTemplatePickerOpen,
  setIsTemplatePickerOpen,
  selectedTemplate,
  streakPreview,
  submitting,
}) {
  return (
    <section className="h-fit rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm lg:sticky lg:top-6">
      <h2 className="text-lg font-bold text-emerald-950">Create schedule</h2>
      <p className="mt-1 text-sm text-emerald-700">
        Everything in one panel, no extra page.
      </p>

      <form onSubmit={handleCreate} className="mt-4 space-y-4">
        <RepoSelector
          loadingRepos={loadingRepos}
          repoQuery={repoQuery}
          onRepoQueryChange={onRepoQueryChange}
          selectedRepo={selectedRepo}
          filteredRepos={filteredRepos}
          onPickRepo={onPickRepo}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-emerald-900">
            Branch
          </label>
          {loadingBranches ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading branches...
            </div>
          ) : branches.length > 0 ? (
            <select
              value={form.branch}
              onChange={(event) => updateForm("branch", event.target.value)}
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
            >
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={form.branch}
              onChange={(event) => updateForm("branch", event.target.value)}
              placeholder="main"
              className="w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
            />
          )}
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateTimeControls
              form={form}
              updateForm={updateForm}
              earliestAllowedDateTime={earliestAllowedDateTime}
              minDateText={minDateText}
              minTimeTextForSelectedDate={minTimeTextForSelectedDate}
              hasMinimumLeadTime={hasMinimumLeadTime}
              MIN_SCHEDULE_LEAD_MINUTES={MIN_SCHEDULE_LEAD_MINUTES}
            />
          </div>
        </div>

        <PushesCommitSection
          form={form}
          updateForm={updateForm}
          clampIntegerString={clampIntegerString}
        />

        <StreakBuilderSection
          form={form}
          updateForm={updateForm}
          updateCustomTime={updateCustomTime}
          removeCustomTime={removeCustomTime}
          addCustomTime={addCustomTime}
          minDateText={minDateText}
          minTimeTextForSelectedDate={minTimeTextForSelectedDate}
          clampIntegerString={clampIntegerString}
          MAX_PUSHES_PER_DAY={MAX_PUSHES_PER_DAY}
          STREAK_TEMPLATES={STREAK_TEMPLATES}
          hasValidTemplateRange={hasValidTemplateRange}
          isTemplatePickerOpen={isTemplatePickerOpen}
          setIsTemplatePickerOpen={setIsTemplatePickerOpen}
          selectedTemplate={selectedTemplate}
          streakPreview={streakPreview}
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {form.streakMode ? "Create streak" : "Create schedule"}
            </>
          )}
        </button>
      </form>
    </section>
  );
}
