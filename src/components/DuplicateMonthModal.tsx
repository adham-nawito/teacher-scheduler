"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createSessions, fetchRecurringSeries, type RecurringSeries } from "@/lib/data";
import {
  allWeekdaysInMonth,
  formatTime,
  MONTH_LABELS,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/dates";

type Candidate = RecurringSeries & { dates: string[] };

export default function DuplicateMonthModal({
  userId,
  targetYear,
  targetMonth,
  onClose,
  onDone,
}: {
  userId: string;
  targetYear: number;
  targetMonth: number; // 0-indexed
  onClose: () => void;
  onDone: (count: number) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const prevDate = useMemo(() => new Date(targetYear, targetMonth - 1, 1), [targetYear, targetMonth]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRecurringSeries(supabase, prevDate.getFullYear(), prevDate.getMonth())
      .then((series) => {
        if (cancelled) return;
        const withDates: Candidate[] = series.map((s) => ({
          ...s,
          dates: allWeekdaysInMonth(targetYear, targetMonth, s.weekday).map(toDateKey),
        }));
        setCandidates(withDates);
        setSelected(new Set(withDates.map((c) => c.recurrenceGroup)));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load last month's sessions.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, prevDate, targetYear, targetMonth]);

  function toggle(recurrenceGroup: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(recurrenceGroup)) next.delete(recurrenceGroup);
      else next.add(recurrenceGroup);
      return next;
    });
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      let total = 0;
      for (const c of candidates) {
        if (!selected.has(c.recurrenceGroup)) continue;
        const inserted = await createSessions(supabase, {
          userId,
          studentId: c.studentId,
          dateKeys: c.dates,
          startTime: c.startTime,
          recurrenceGroup: crypto.randomUUID(),
        });
        total += inserted;
      }
      onDone(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  const prevMonthLabel = MONTH_LABELS[prevDate.getMonth()];
  const targetMonthLabel = MONTH_LABELS[targetMonth];

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">
          Duplicate recurring sessions
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          From {prevMonthLabel} into {targetMonthLabel}
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 max-h-80 overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
          ) : candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No recurring sessions found in {prevMonthLabel} to duplicate.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {candidates.map((c) => (
                <li key={c.recurrenceGroup} className="flex items-start gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(c.recurrenceGroup)}
                    onChange={() => toggle(c.recurrenceGroup)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.studentName}</p>
                    <p className="text-xs text-gray-500">
                      {WEEKDAY_LABELS[c.weekday]}s at {formatTime(c.startTime)} — will book{" "}
                      {c.dates.length} session{c.dates.length === 1 ? "" : "s"} in{" "}
                      {targetMonthLabel}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || candidates.length === 0 || selected.size === 0}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? "Booking…" : `Book ${selected.size} selected`}
          </button>
        </div>
      </div>
    </div>
  );
}
