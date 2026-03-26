import React, { useState, useEffect, useMemo } from "react";

export default function TimePickerModal({
  isOpen,
  initialTime,
  selectedDate,
  minDateText,
  minTimeTextForSelectedDate,
  onClose,
  onConfirm,
}) {
  const parseInitial = (t) => {
    if (!t) return { hour: 12, minute: 0, ampm: "AM" };
    const [hh, mm] = t.split(":").map(Number);
    const ampm = hh >= 12 ? "PM" : "AM";
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    return { hour: hour12, minute: mm, ampm };
  };

  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState("AM");

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  const quickTimes = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];

  const minQuickPickTime =
    selectedDate && selectedDate === minDateText
      ? minTimeTextForSelectedDate || "00:00"
      : "00:00";

  const contextQuickTimes = useMemo(() => {
    return quickTimes.filter((time24) => time24 >= minQuickPickTime);
  }, [minQuickPickTime]);

  const formatLabel = (time24) => {
    const [hhText, mmText] = time24.split(":");
    const hh = Number(hhText);
    const mm = Number(mmText);
    const labelAmPm = hh >= 12 ? "PM" : "AM";
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${hour12}:${String(mm).padStart(2, "0")} ${labelAmPm}`;
  };

  useEffect(() => {
    const parsed = parseInitial(initialTime);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setAmpm(parsed.ampm);
  }, [initialTime, isOpen]);

  const confirm = () => {
    let hh = hour % 12;
    if (ampm === "PM") hh += 12;
    const hhStr = String(hh).padStart(2, "0");
    const mmStr = String(minute).padStart(2, "0");
    onConfirm && onConfirm(`${hhStr}:${mmStr}`);
    onClose && onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="w-[320px] rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-emerald-950">Pick time</h3>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)] items-end gap-2">
          <label className="text-xs font-medium text-emerald-800">
            Hour
            <select
              value={hour}
              onChange={(event) => setHour(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm text-emerald-950 outline-none focus:border-emerald-500"
            >
              {hourOptions.map((value) => (
                <option key={value} value={value}>
                  {String(value).padStart(2, "0")}
                </option>
              ))}
            </select>
          </label>

          <span className="pb-2 text-lg font-semibold text-emerald-700">:</span>

          <label className="text-xs font-medium text-emerald-800">
            Minute
            <select
              value={minute}
              onChange={(event) => setMinute(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm text-emerald-950 outline-none focus:border-emerald-500"
            >
              {minuteOptions.map((value) => (
                <option key={value} value={value}>
                  {String(value).padStart(2, "0")}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-emerald-800">
            Period
            <select
              value={ampm}
              onChange={(event) => setAmpm(event.target.value)}
              className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm text-emerald-950 outline-none focus:border-emerald-500"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </label>
        </div>

        <p className="mt-2 text-xs text-emerald-700">
          Selected: {String(hour).padStart(2, "0")}:
          {String(minute).padStart(2, "0")} {ampm}
        </p>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          onClick={confirm}
        >
          Set time
        </button>
      </div>
    </div>
  );
}
