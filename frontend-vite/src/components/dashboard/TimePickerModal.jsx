import React, { useState, useEffect } from "react";

export default function TimePickerModal({
  isOpen,
  initialTime,
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

  useEffect(() => {
    const parsed = parseInitial(initialTime);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setAmpm(parsed.ampm);
  }, [initialTime, isOpen]);

  const inc = (val, min, max) => (val === max ? min : val + 1);
  const dec = (val, min, max) => (val === min ? max : val - 1);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-80 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">Select time</h3>
          <button className="text-sm text-gray-500" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center">
            <button
              className="px-2 py-1 bg-gray-100 rounded"
              onClick={() => setHour((h) => inc(h, 1, 12))}
            >
              ▲
            </button>
            <div className="text-2xl font-semibold my-2">
              {String(hour).padStart(2, "0")}
            </div>
            <button
              className="px-2 py-1 bg-gray-100 rounded"
              onClick={() => setHour((h) => dec(h, 1, 12))}
            >
              ▼
            </button>
          </div>

          <div className="text-2xl">:</div>

          <div className="flex flex-col items-center">
            <button
              className="px-2 py-1 bg-gray-100 rounded"
              onClick={() => setMinute((m) => inc(m, 0, 59))}
            >
              ▲
            </button>
            <div className="text-2xl font-semibold my-2">
              {String(minute).padStart(2, "0")}
            </div>
            <button
              className="px-2 py-1 bg-gray-100 rounded"
              onClick={() => setMinute((m) => dec(m, 0, 59))}
            >
              ▼
            </button>
          </div>

          <div className="flex flex-col items-center">
            <button
              className="px-3 py-1 bg-gray-100 rounded"
              onClick={() => setAmpm((a) => (a === "AM" ? "PM" : "AM"))}
            >
              Toggle
            </button>
            <div className="text-lg font-medium my-2">{ampm}</div>
            <div style={{ height: 32 }} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1 rounded bg-gray-100" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white"
            onClick={confirm}
          >
            Set time
          </button>
        </div>
      </div>
    </div>
  );
}
