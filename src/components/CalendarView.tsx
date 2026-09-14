"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildMonthGrid,
  formatTime,
  MONTH_LABELS,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import {
  createSessions,
  deleteSession,
  fetchMonthSessions,
  findOrCreateStudent,
  updateSeriesFromDate,
  updateSession,
} from "@/lib/data";
import type { SessionWithStudent } from "@/lib/types";
import BookingModal, { type BookingSubmit } from "./BookingModal";
import EditSessionModal, { type EditSubmit } from "./EditSessionModal";
import DuplicateMonthModal from "./DuplicateMonthModal";

export default function CalendarView() {
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => new Date(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sessions, setSessions] = useState<SessionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(toDateKey(today));
  const [editingSession, setEditingSession] = useState<SessionWithStudent | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Group sessions by date key for quick lookup while rendering the grid.
  const byDate = useMemo(() => {
    const map = new Map<string, SessionWithStudent[]>();
    for (const s of sessions) {
      const list = map.get(s.session_date) ?? [];
      list.push(s);
      map.set(s.session_date, list);
    }
    return map;
  }, [sessions]);

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
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleBook(values: BookingSubmit) {
    if (!userId) throw new Error("Not signed in.");
    const student = await findOrCreateStudent(
      supabase,
      userId,
      values.studentName,
    );
    await createSessions(supabase, {
      userId,
      studentId: student.id,
      dateKeys: values.dateKeys,
      startTime: values.startTime,
      recurrenceGroup: values.recurring ? crypto.randomUUID() : null,
    });
    setModalDate(null);
    await load();
  }

  async function handleDelete(id: string) {
    await deleteSession(supabase, id);
    await load();
  }

  async function handleEdit(values: EditSubmit) {
    if (!userId || !editingSession) throw new Error("Not signed in.");
    const student = await findOrCreateStudent(supabase, userId, values.studentName);

    if (values.scope === "series" && editingSession.recurrence_group) {
      const result = await updateSeriesFromDate(supabase, {
        recurrenceGroup: editingSession.recurrence_group,
        fromDate: editingSession.session_date,
        studentId: student.id,
        startTime: values.startTime,
      });
      setNotice(
        result.skipped.length === 0
          ? `Updated ${result.updated} session${result.updated === 1 ? "" : "s"} in the series.`
          : `Updated ${result.updated} session${result.updated === 1 ? "" : "s"}. Skipped: ${result.skipped
              .map((s) => `${s.sessionDate} (${s.reason})`)
              .join(", ")}.`,
      );
    } else {
      await updateSession(supabase, editingSession.id, {
        studentId: student.id,
        startTime: values.startTime,
        sessionDate: values.sessionDate,
      });
    }

    setEditingSession(null);
    await load();
  }

  async function handleDuplicated(count: number) {
    setDuplicating(false);
    setNotice(`Booked ${count} session${count === 1 ? "" : "s"} for ${MONTH_LABELS[month]}.`);
    await load();
  }

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const selectedSessions = byDate.get(selectedKey) ?? [];
  const todayKey = toDateKey(today);
  const prevMonthDate = new Date(year, month - 1, 1);

  return (
    <div className="space-y-6">
      {/* Month header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">
          {MONTH_LABELS[month]} {year}
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDuplicating(true)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Duplicate recurring sessions from {MONTH_LABELS[prevMonthDate.getMonth()]}
          </button>
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
            Today
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

      {notice && (
        <p className="flex items-start justify-between gap-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-green-500 hover:text-green-700">
            ×
          </button>
        </p>
      )}

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((date, i) => {
            const key = toDateKey(date);
            const inMonth = date.getMonth() === month;
            const daySessions = byDate.get(key) ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            return (
              <button
                key={i}
                onClick={() => {
                  setSelectedKey(key);
                  setModalDate(date);
                }}
                className={`min-h-[76px] border-b border-r border-gray-100 p-1.5 text-left align-top transition last:border-r-0 ${
                  inMonth ? "bg-white hover:bg-brand-50" : "bg-gray-50/60"
                } ${isSelected ? "ring-2 ring-inset ring-brand-500" : ""}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-brand-500 font-semibold text-white"
                      : inMonth
                        ? "text-gray-700"
                        : "text-gray-400"
                  }`}
                >
                  {date.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {daySessions.slice(0, 2).map((s) => (
                    <div
                      key={s.id}
                      className="truncate rounded bg-brand-100 px-1 py-0.5 text-[10px] leading-tight text-brand-700"
                    >
                      {formatTime(s.start_time)} {s.students?.name ?? "?"}
                    </div>
                  ))}
                  {daySessions.length > 2 && (
                    <div className="px-1 text-[10px] text-gray-400">
                      +{daySessions.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {new Date(selectedKey + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <button
            onClick={() => setModalDate(new Date(selectedKey + "T00:00:00"))}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Add session
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : selectedSessions.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions booked this day.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {selectedSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm font-medium text-gray-700">
                    {formatTime(s.start_time)}
                  </span>
                  <span className="text-sm text-gray-900">
                    {s.students?.name ?? "Unknown"}
                  </span>
                  {s.recurrence_group && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                      weekly
                    </span>
                  )}
                  {s.completed && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">
                      done
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingSession(s)}
                    className="text-xs text-gray-400 hover:text-brand-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalDate && (
        <BookingModal
          date={modalDate}
          onClose={() => setModalDate(null)}
          onSubmit={handleBook}
        />
      )}

      {editingSession && (
        <EditSessionModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSubmit={handleEdit}
        />
      )}

      {duplicating && userId && (
        <DuplicateMonthModal
          userId={userId}
          targetYear={year}
          targetMonth={month}
          onClose={() => setDuplicating(false)}
          onDone={handleDuplicated}
        />
      )}
    </div>
  );
}
