import React from "react";

export default function PushesCommitSection({
  form,
  updateForm,
  clampIntegerString,
}) {
  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-emerald-900">
          Pushes at selected schedule time
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={form.pushCount}
          onChange={(event) => {
            const incoming = event.target.value;
            if (/^\d*$/.test(incoming)) {
              updateForm("pushCount", incoming);
            }
          }}
          onBlur={() => {
            updateForm("pushCount", clampIntegerString(form.pushCount, 1, 20));
          }}
          className="w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
        />
        <p className="mt-1 text-xs text-emerald-700">
          This applies to normal schedule and each streak schedule slot.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-emerald-900">
          Commit message (optional)
        </label>
        <input
          value={form.commitMessage}
          onChange={(event) => updateForm("commitMessage", event.target.value)}
          placeholder="Automated push by AutoGreener"
          className="w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
        />
      </div>
    </>
  );
}
