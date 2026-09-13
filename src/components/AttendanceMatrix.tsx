"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  dayOfMonth,
  formatTime,
  fromDateKey,
  MONTH_LABELS,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import { fetchMonthSessions, setSessionCompleted } from "@/lib/data";
import type { SessionWithStudent } from "@/lib/types";

type Row = {
  studentId: string;
  studentName: string;
  byDate: Map<string, SessionWithStudent[]>;
  booked: number;
  completed: number;
};

export default function AttendanceMatrix() {
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => new Date(), []);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sessions, setSessions] = useState<SessionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track cells being saved to avoid double toggles.
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMonthSessions(supabase, year, month);
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }, [supabase, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  // Columns: every distinct date that has at least one session, sorted.
  const dateKeys = useMemo(() => {
    const set = new Set(sessions.map((s) => s.session_date));
    return [...set].sort();
  }, [sessions]);

  // Rows: one per student, with sessions bucketed by date.
  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    for (const s of sessions) {
      const name = s.students?.name ?? "Unknown";
      let row = map.get(s.student_id);
      if (!row) {
        row = {
          studentId: s.student_id,
          studentName: name,
          byDate: new Map(),
          booked: 0,
          completed: 0,
        };
        map.set(s.student_id, row);
      }
      const list = row.byDate.get(s.session_date) ?? [];
      list.push(s);
      row.byDate.set(s.session_date, list);
      row.booked += 1;
      if (s.completed) row.completed += 1;
    }
    return [...map.values()].sort((a, b) =>
      a.studentName.localeCompare(b.studentName),
    );
  }, [sessions]);

  async function toggle(session: SessionWithStudent) {
    if (saving.has(session.id)) return;
    const next = !session.completed;
    setSaving((prev) => new Set(prev).add(session.id));
    // Optimistic update.
    setSessions((prev) =>
      prev.map((s) => (s.id === session.id ? { ...s, completed: next } : s)),
    );
    try {
      await setSessionCompleted(supabase, session.id, next);
    } catch {
      // Revert on failure.
      setSessions((prev) =>
        prev.map((s) =>
          s.id === session.id ? { ...s, completed: !next } : s,
        ),
      );
      setError("Could not save that change. Please try again.");
    } finally {
      setSaving((prev) => {
        const copy = new Set(prev);
        copy.delete(session.id);
        return copy;
      });
    }
  }

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">
            {MONTH_LABELS[month]} {year} — tick a cell when a session is done.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ‹
          </button>
          <button
            onClick={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth());
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            This month
          </button>
          <button
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ›
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            No sessions this month yet. Book some on the Calendar and they’ll
            show up here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700">
                  Student
                </th>
                {dateKeys.map((key) => {
                  const d = fromDateKey(key);
                  return (
                    <th
                      key={key}
                      className="border-b border-gray-200 px-2 py-2 text-center font-medium text-gray-500"
                    >
                      <div className="text-[10px] uppercase">
                        {WEEKDAY_LABELS[d.getDay()]}
                      </div>
                      <div className="text-sm font-semibold text-gray-800">
                        {dayOfMonth(key)}
                      </div>
                    </th>
                  );
                })}
                <th className="border-b border-l border-gray-200 bg-gray-50 px-3 py-3 text-center font-semibold text-gray-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId} className="even:bg-gray-50/40">
                  <td className="sticky left-0 z-10 border-r border-gray-200 bg-inherit px-4 py-2 font-medium text-gray-900">
                    {row.studentName}
                  </td>
                  {dateKeys.map((key) => {
                    const cell = row.byDate.get(key) ?? [];
                    return (
                      <td
                        key={key}
                        className="border-l border-gray-100 px-2 py-2 text-center align-middle"
                      >
                        {cell.length === 0 ? (
                          <span className="text-gray-200">·</span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            {cell.map((s) => (
                              <label
                                key={s.id}
                                title={`${formatTime(s.start_time)} — ${
                                  s.completed ? "done" : "not done"
                                }`}
                                className="cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={s.completed}
                                  disabled={saving.has(s.id)}
                                  onChange={() => toggle(s)}
                                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-l border-gray-200 px-3 py-2 text-center font-semibold text-gray-700">
                    {row.completed}
                    <span className="text-gray-400">/{row.booked}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
