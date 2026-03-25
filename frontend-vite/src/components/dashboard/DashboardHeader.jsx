import React from "react";
import { Leaf } from "lucide-react";

export default function DashboardHeader({ stats }) {
  return (
    <section className="mb-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
            <Leaf className="h-3.5 w-3.5" />
            Lightweight mode
          </p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-emerald-950">
            Contribution Scheduler
          </h1>
          <p className="mt-1 text-sm text-emerald-800">
            Pick a repo, set a time, and automate your green graph without extra
            noise.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xs font-medium text-emerald-700">Total</p>
            <p className="text-xl font-bold text-emerald-950">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-lime-100 bg-lime-50 px-4 py-3 text-center">
            <p className="text-xs font-medium text-lime-700">Active</p>
            <p className="text-xl font-bold text-lime-900">{stats.active}</p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-center">
            <p className="text-xs font-medium text-teal-700">Done</p>
            <p className="text-xl font-bold text-teal-900">{stats.completed}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
