import React, { useMemo, useState } from "react";

// Simple popover calendar grid. Props:
// - selectedDate (YYYY-MM-DD)
// - onSelect(dateString)
// - minDate (Date or null) disables earlier days
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

const pad = (n) => String(n).padStart(2, "0");

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CalendarPicker({ selectedDate, onSelect, minDate }) {
  const today = useMemo(() => new Date(), []);
  const initial = selectedDate ? new Date(selectedDate) : today;
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  const firstDay = useMemo(
    () => new Date(year, month, 1).getDay(),
    [year, month],
  );
  const totalDays = useMemo(() => daysInMonth(year, month), [year, month]);

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const isDisabled = (d) => {
    if (!minDate) return false;
    const candidate = new Date(year, month, d, 0, 0, 0, 0);
    return (
      candidate <
      new Date(
        minDate.getFullYear(),
        minDate.getMonth(),
        minDate.getDate(),
        0,
        0,
        0,
        0,
      )
    );
  };

  return (
    <div className="w-[300px] bg-white rounded-lg shadow-md border p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">
          {new Date(year, month).toLocaleString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </div>
        <div className="flex gap-1">
          <button
            onClick={handlePrev}
            className="px-2 py-1 rounded hover:bg-gray-100"
          >
            ◀
          </button>
          <button
            onClick={handleNext}
            className="px-2 py-1 rounded hover:bg-gray-100"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] text-center mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="font-medium text-gray-500">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {Array.from({ length: totalDays }).map((_, idx) => {
          const d = idx + 1;
          const iso = toISODate(new Date(year, month, d));
          const disabled = isDisabled(d);
          const active = selectedDate === iso;
          return (
            <button
              key={iso}
              onClick={() => !disabled && onSelect(iso)}
              disabled={disabled}
              className={`h-8 w-8 flex items-center justify-center text-sm rounded ${disabled ? "text-gray-300" : active ? "bg-emerald-600 text-white" : "hover:bg-gray-100"}`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
