import React from "react";
import { Flame } from "lucide-react";

export default function StreakBuilderSection({
  form,
  updateForm,
  updateCustomTime,
  removeCustomTime,
  addCustomTime,
  minDateText,
  minTimeTextForSelectedDate,
  clampIntegerString,
  MAX_PUSHES_PER_DAY,
  STREAK_TEMPLATES,
  hasValidTemplateRange,
  isTemplatePickerOpen,
  setIsTemplatePickerOpen,
  selectedTemplate,
  streakPreview,
}) {
  return (
    <div className="rounded-xl border border-lime-200 bg-lime-50 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-lime-900">
        <Flame className="h-4 w-4" />
        Killer feature: Streak Builder
      </p>
      <p className="mt-1 text-xs text-lime-800">
        Create multiple day-by-day schedules in one click.
      </p>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-lime-900">
          <input
            type="checkbox"
            checked={form.streakMode}
            onChange={(event) => updateForm("streakMode", event.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          Enable streak mode
        </label>
      </div>

      {form.streakMode && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-lime-900">
              End date
            </label>
            <input
              type="date"
              value={form.streakEndDate}
              onChange={(event) =>
                updateForm("streakEndDate", event.target.value)
              }
              min={form.pushDate || minDateText}
              className="w-full rounded-lg border border-lime-300 bg-white px-2 py-1.5 text-sm text-lime-900 outline-none"
            />
          </div>
          <p className="col-span-2 text-[11px] text-lime-800">
            End date is required and must be on or after start date.
          </p>

          <div className="col-span-2 rounded-lg border border-lime-200 bg-white p-2.5">
            <p className="mb-2 text-xs font-medium text-lime-900">
              Pushes per day
            </p>
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateForm("pushPlanMode", "interval")}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                  form.pushPlanMode === "interval"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-lime-200 bg-white text-lime-900"
                }`}
              >
                Interval
              </button>
              <button
                type="button"
                onClick={() => updateForm("pushPlanMode", "custom")}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                  form.pushPlanMode === "custom"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-lime-200 bg-white text-lime-900"
                }`}
              >
                Custom time set
              </button>
            </div>

            {form.pushPlanMode === "interval" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-lime-900">
                    Base time
                  </label>
                  <input
                    type="time"
                    value={form.pushTime}
                    onChange={(event) =>
                      updateForm("pushTime", event.target.value)
                    }
                    min={
                      form.pushDate === minDateText
                        ? minTimeTextForSelectedDate
                        : undefined
                    }
                    step="60"
                    className="w-full rounded-lg border border-lime-300 px-2 py-1.5 text-sm text-lime-900 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-lime-900">
                    Every X hours
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.intervalHours}
                    onChange={(event) => {
                      const incoming = event.target.value;
                      if (/^\d*$/.test(incoming)) {
                        updateForm("intervalHours", incoming);
                      }
                    }}
                    onBlur={() => {
                      updateForm(
                        "intervalHours",
                        clampIntegerString(form.intervalHours, 1, 23),
                      );
                    }}
                    className="w-full rounded-lg border border-lime-300 px-2 py-1.5 text-sm text-lime-900 outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {form.customTimes.map((time, index) => (
                  <div key={`${index}-${time}`} className="flex gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(event) =>
                        updateCustomTime(index, event.target.value)
                      }
                      step="60"
                      className="w-full rounded-lg border border-lime-300 px-2 py-1.5 text-sm text-lime-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomTime(index)}
                      disabled={form.customTimes.length <= 1}
                      className="rounded-lg border border-lime-200 px-2 text-xs text-lime-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCustomTime}
                  disabled={form.customTimes.length >= MAX_PUSHES_PER_DAY}
                  className="rounded-lg border border-lime-300 bg-lime-50 px-2.5 py-1 text-xs font-medium text-lime-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add time
                </button>
              </div>
            )}
          </div>

          {hasValidTemplateRange ? (
            <div className="col-span-2">
              <button
                type="button"
                onClick={() => setIsTemplatePickerOpen((previous) => !previous)}
                className="mb-1 flex w-full items-center justify-between rounded-lg border border-lime-200 bg-white px-2.5 py-2 text-xs font-medium text-lime-900"
              >
                <span>Contribution pattern template</span>
                <span>{selectedTemplate?.name}</span>
              </button>
              {isTemplatePickerOpen && (
                <div className="max-h-40 space-y-1.5 overflow-auto rounded-lg border border-lime-200 bg-white p-2">
                  {STREAK_TEMPLATES.map((template) => {
                    const active = form.streakTemplate === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          updateForm("streakTemplate", template.id);
                          setIsTemplatePickerOpen(false);
                        }}
                        className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                          active
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-lime-200 bg-white hover:bg-lime-50"
                        }`}
                      >
                        <p className="text-xs font-semibold text-emerald-950">
                          {template.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-emerald-700">
                          {template.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="col-span-2 text-[11px] text-lime-800">
              Pick both start date and end date to unlock pattern templates.
            </p>
          )}

          <div className="col-span-2 rounded-lg border border-lime-200 bg-lime-100/60 px-2.5 py-2 text-[11px] text-lime-900">
            {streakPreview?.error ? (
              <span>{streakPreview.error}</span>
            ) : (
              <span>
                Preview: {selectedTemplate.name} will create about{" "}
                <strong>{streakPreview?.pushCount || 0}</strong> scheduled
                pushes.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
