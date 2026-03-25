import React from "react";
import CalendarPicker from "./CalendarPicker";
import TimePickerModal from "./TimePickerModal";
import { CalendarDays, Clock3 } from "lucide-react";

export default function DateTimeControls({
  form,
  updateForm,
  earliestAllowedDateTime,
  minDateText,
  minTimeTextForSelectedDate,
  hasMinimumLeadTime,
  MIN_SCHEDULE_LEAD_MINUTES,
}) {
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative">
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-emerald-900">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            Date
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={form.pushDate}
              onChange={(e) => updateForm("pushDate", e.target.value)}
              min={minDateText}
              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowCalendar((s) => !s)}
              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700"
            >
              Pick
            </button>
          </div>

          {showCalendar && (
            <div className="mt-2">
              <CalendarPicker
                selectedDate={form.pushDate}
                onSelect={(d) => {
                  updateForm("pushDate", d);
                  setShowCalendar(false);
                }}
                minDate={earliestAllowedDateTime}
              />
            </div>
          )}

          {form.pushDate &&
            form.pushTime &&
            !hasMinimumLeadTime(form.pushDate, form.pushTime) && (
              <p className="mt-1 text-xs text-red-600">
                Pick a time at least {MIN_SCHEDULE_LEAD_MINUTES} minutes from
                now.
              </p>
            )}
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-emerald-900">
            <Clock3 className="h-4 w-4 text-emerald-600" />
            Time
          </label>
          <div className="flex gap-2">
            <input
              type="time"
              value={form.pushTime}
              onChange={(e) => updateForm("pushTime", e.target.value)}
              min={
                form.pushDate === minDateText
                  ? minTimeTextForSelectedDate
                  : undefined
              }
              step="60"
              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowTimePicker(true)}
              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700"
            >
              Pick
            </button>
          </div>

          {form.pushDate &&
            form.pushTime &&
            !hasMinimumLeadTime(form.pushDate, form.pushTime) && (
              <p className="mt-1 text-xs text-red-600">
                Pick a time at least {MIN_SCHEDULE_LEAD_MINUTES} minutes from
                now.
              </p>
            )}

          <TimePickerModal
            isOpen={showTimePicker}
            initialTime={form.pushTime}
            onClose={() => setShowTimePicker(false)}
            onConfirm={(t) => updateForm("pushTime", t)}
          />
        </div>
      </div>
    </div>
  );
}
