"use client";

import { useState } from "react";
import type { SessionWithStudent } from "@/lib/types";

export type EditSubmit = {
  studentName: string;
  startTime: string;
  sessionDate: string; // only used when scope === "single"
  scope: "single" | "series";
};

export default function EditSessionModal({
  session,
  onClose,
  onSubmit,
}: {
  session: SessionWithStudent;
  onClose: () => void;
  onSubmit: (values: EditSubmit) => Promise<void>;
}) {
  const isRecurring = Boolean(session.recurrence_group);

  const [studentName, setStudentName] = useState(session.students?.name ?? "");
  const [startTime, setStartTime] = useState(session.start_time.slice(0, 5));
  const [sessionDate, setSessionDate] = useState(session.session_date);
  const [scope, setScope] = useState<"single" | "series">("single");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim()) {
      setError("Please enter a student name.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ studentName, startTime, sessionDate, scope });
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
        <h2 className="text-lg font-semibold text-gray-900">Edit session</h2>

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
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                disabled={scope === "series"}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          {isRecurring && (
            <div className="space-y-2 rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">
                This session is part of a weekly series. Apply this change to:
              </p>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "single"}
                  onChange={() => setScope("single")}
                  className="mt-0.5 h-4 w-4 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">
                  Just this session
                  <span className="block text-xs text-gray-500">
                    Only {new Date(session.session_date + "T00:00:00").toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" },
                    )}{" "}
                    changes. You can still move it to a different date/time.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "series"}
                  onChange={() => setScope("series")}
                  className="mt-0.5 h-4 w-4 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">
                  This and every future session in the series
                  <span className="block text-xs text-gray-500">
                    Updates the student and/or time for all upcoming
                    occurrences. The date/weekday stays the same for each —
                    if you need a different weekday, delete the series and
                    rebook instead.
                  </span>
                </span>
              </label>
            </div>
          )}

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
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
