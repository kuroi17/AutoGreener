import React, { useEffect, useMemo, useState } from "react";

const QUICK_TIME_OPTIONS = [
  "06:00",
  "09:00",
  "12:00",
  "15:00",
  "18:00",
  "21:00",
];

const MINUTE_STEP = 5;

const parseTime24ToParts = (time24) => {
  if (!time24) {
    return { hour24: 12, hour12: 12, minute: 0, ampm: "PM" };
  }

  const [hhText, mmText] = time24.split(":");
  const hour24 = Number(hhText);
  const minute = Number(mmText);

  if (
    Number.isNaN(hour24) ||
    Number.isNaN(minute) ||
    hour24 < 0 ||
    hour24 > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { hour24: 12, hour12: 12, minute: 0, ampm: "PM" };
  }

  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return { hour24, hour12, minute, ampm };
};

const toTime24 = ({ hour, minute, ampm }) => {
  let hour24 = hour % 12;
  if (ampm === "PM") {
    hour24 += 12;
  }

  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const toMinutes = (time24) => {
  const [hhText, mmText] = String(time24 || "00:00").split(":");
  return Number(hhText) * 60 + Number(mmText);
};

const clampToMinimumTime = (time24, minimumTime24) => {
  if (!minimumTime24) {
    return time24;
  }

  return toMinutes(time24) < toMinutes(minimumTime24) ? minimumTime24 : time24;
};

const formatLabel = (time24) => {
  const { hour12, minute, ampm } = parseTime24ToParts(time24);
  return `${hour12}:${String(minute).padStart(2, "0")} ${ampm}`;
};

const buildMinuteOptions = (minimumTime24, selectedHour24) => {
  const minimumMinutes = toMinutes(minimumTime24);
  const minimumHour24 = Math.floor(minimumMinutes / 60);
  const minimumMinute = minimumMinutes % 60;

  return Array.from(
    { length: 60 / MINUTE_STEP },
    (_, index) => index * MINUTE_STEP,
  ).filter(
    (minuteValue) =>
      selectedHour24 !== minimumHour24 || minuteValue >= minimumMinute,
  );
};

export default function TimePickerModal({
  isOpen,
  initialTime,
  selectedDate,
  minDateText,
  minTimeTextForSelectedDate,
  onClose,
  onConfirm,
}) {
  const minSelectableTime =
    selectedDate && selectedDate === minDateText
      ? minTimeTextForSelectedDate || "00:00"
      : "00:00";

  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState("PM");

  const hourOptions = Array.from({ length: 12 }, (_, index) => index + 1);

  const contextQuickTimes = useMemo(() => {
    return QUICK_TIME_OPTIONS.filter(
      (time24) => toMinutes(time24) >= toMinutes(minSelectableTime),
    );
  }, [minSelectableTime]);

  const selectedTime24 = useMemo(
    () => toTime24({ hour, minute, ampm }),
    [hour, minute, ampm],
  );

  const selectedHour24 = useMemo(
    () => parseTime24ToParts(selectedTime24).hour24,
    [selectedTime24],
  );

  const minuteOptions = useMemo(
    () => buildMinuteOptions(minSelectableTime, selectedHour24),
    [minSelectableTime, selectedHour24],
  );

  const isBelowMinimum =
    selectedDate === minDateText &&
    toMinutes(selectedTime24) < toMinutes(minSelectableTime);

  useEffect(() => {
    const safeTime = clampToMinimumTime(
      initialTime || minSelectableTime,
      minSelectableTime,
    );
    const parsed = parseTime24ToParts(safeTime);

    setHour(parsed.hour12);
    setMinute(parsed.minute);
    setAmpm(parsed.ampm);
  }, [initialTime, isOpen, minSelectableTime]);

  useEffect(() => {
    if (!minuteOptions.includes(minute)) {
      setMinute(minuteOptions[0] ?? 0);
    }
  }, [minute, minuteOptions]);

  const applyTime = (time24) => {
    const parsed = parseTime24ToParts(
      clampToMinimumTime(time24, minSelectableTime),
    );
    setHour(parsed.hour12);
    setMinute(parsed.minute);
    setAmpm(parsed.ampm);
  };

  const confirm = () => {
    const finalTime = clampToMinimumTime(selectedTime24, minSelectableTime);
    onConfirm && onConfirm(finalTime);
    onClose && onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="w-[340px] rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-emerald-950">
            Pick time
          </h3>
          <p className="text-xs text-emerald-700">
            Cleaner scheduling with fewer clicks.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
          Selected time
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-bold tracking-tight text-emerald-950">
            {formatLabel(selectedTime24)}
          </span>
          {selectedDate === minDateText && (
            <span className="mb-1 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-emerald-700">
              Earliest: {formatLabel(minSelectableTime)}
            </span>
          )}
        </div>

        {selectedDate === minDateText && (
          <button
            type="button"
            onClick={() => applyTime(minSelectableTime)}
            className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
          >
            Use earliest allowed time
          </button>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-emerald-100 p-3">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-emerald-700">
          Fine tune
        </p>

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

        <p className="mt-3 text-xs text-emerald-700">
          Minutes use 5-minute steps so the picker stays short and easier to
          use.
        </p>

        {isBelowMinimum && (
          <p className="mt-2 text-xs text-red-600">
            This time is too early for today. We’ll use the earliest allowed
            time instead.
          </p>
        )}
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
