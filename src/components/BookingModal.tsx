"use client";

import { useState } from "react";
import { WEEKDAY_LABELS, sameWeekdayThroughMonth, toDateKey } from "@/lib/dates";

export type BookingSubmit = {
  studentName: string;
  startTime: string;
  dateKeys: string[];
  recurring: boolean;
};

export default function BookingModal({
  date,
  onClose,
  onSubmit,
}: {
  date: Date;
  onClose: () => void;
  onSubmit: (values: BookingSubmit) => Promise<void>;
}) {
  const [studentName, setStudentName] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekday = WEEKDAY_LABELS[date.getDay()];
  const recurringDates = sameWeekdayThroughMonth(date);
  const prettyDate = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim()) {
      setError("Please enter a student name.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const dateKeys = recurring
        ? recurringDates.map(toDateKey)
        : [toDateKey(date)];
      await onSubmit({ studentName, startTime, dateKeys, recurring });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">New session</h2>
        <p className="mt-0.5 text-sm text-gray-500">{prettyDate}</p>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Student name
            </label>
            <input
              autoFocus
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Sara Ahmed"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Time slot
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">
              Repeat weekly on {weekday}s
              <span className="block text-xs text-gray-500">
                Books {recurringDates.length} session
                {recurringDates.length === 1 ? "" : "s"} through the end of the
                month.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Book session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
