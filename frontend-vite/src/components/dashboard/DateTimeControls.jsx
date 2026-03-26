import React, { useRef, useEffect } from "react";
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
  const showLeadTimeWarning =
    form.pushDate &&
    form.pushTime &&
    !hasMinimumLeadTime(form.pushDate, form.pushTime);

  const calendarRef = useRef(null);
  const timeRef = useRef(null);

  const toggleCalendar = () => {
    setShowCalendar((prev) => {
      const next = !prev;
      if (next) setShowTimePicker(false);
      return next;
    });
  };

  const toggleTime = () => {
    setShowTimePicker((prev) => {
      const next = !prev;
      if (next) setShowCalendar(false);
      return next;
    });
  };

  // Close calendar on outside click or ESC
  useEffect(() => {
    if (!showCalendar) return undefined;

    const onDown = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") setShowCalendar(false);
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showCalendar]);

  // Close time picker on outside click or ESC
  useEffect(() => {
    if (!showTimePicker) return undefined;

    const onDown = (e) => {
      if (timeRef.current && !timeRef.current.contains(e.target)) {
        setShowTimePicker(false);
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") setShowTimePicker(false);
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showTimePicker]);

  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="relative">
          <label className="mb-2 flex items-center gap-1 text-sm font-medium text-emerald-900">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            Date
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2">
            <input
              type="date"
              value={form.pushDate}
              onChange={(e) => updateForm("pushDate", e.target.value)}
              readOnly
              onClick={toggleCalendar}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCalendar();
                }
              }}
              min={minDateText}
              className="min-w-0 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={toggleCalendar}
              className="whitespace-nowrap rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              Pick
            </button>
          </div>

          {showCalendar && (
            <div
              ref={calendarRef}
              className="absolute left-0 top-full z-30 mt-2 transform-gpu transition-all duration-200 origin-top"
              style={{
                opacity: showCalendar ? 1 : 0,
                transform: showCalendar ? "scale(1)" : "scale(0.96)",
              }}
            >
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
        </div>

        <div className="relative">
          <label className="mb-2 flex items-center gap-1 text-sm font-medium text-emerald-900">
            <Clock3 className="h-4 w-4 text-emerald-600" />
            Time
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2">
            <input
              type="time"
              value={form.pushTime}
              onChange={(e) => updateForm("pushTime", e.target.value)}
              readOnly
              onClick={toggleTime}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTime();
                }
              }}
              min={
                form.pushDate === minDateText
                  ? minTimeTextForSelectedDate
                  : undefined
              }
              step="60"
              className="min-w-0 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={toggleTime}
              className="whitespace-nowrap rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              Pick
            </button>
          </div>

          {showTimePicker && (
            <div
              ref={timeRef}
              className="absolute left-0 top-full z-30 mt-2 transform-gpu transition-all duration-200 origin-top-right"
              style={{
                opacity: showTimePicker ? 1 : 0,
                transform: showTimePicker ? "scale(1)" : "scale(0.96)",
              }}
            >
              <TimePickerModal
                isOpen={showTimePicker}
                initialTime={form.pushTime}
                selectedDate={form.pushDate}
                minDateText={minDateText}
                minTimeTextForSelectedDate={minTimeTextForSelectedDate}
                onClose={() => setShowTimePicker(false)}
                onConfirm={(t) => updateForm("pushTime", t)}
              />
            </div>
          )}
        </div>
      </div>

      {showLeadTimeWarning && (
        <p className="mt-2 text-xs text-red-600">
          Pick a time at least {MIN_SCHEDULE_LEAD_MINUTES} minutes from now.
        </p>
      )}
    </div>
  );
}
