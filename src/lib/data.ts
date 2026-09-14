import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session, SessionWithStudent, Student } from "@/lib/types";
import { daysInMonth, fromDateKey, toDateKey } from "@/lib/dates";

/**
 * Find a student by name for this user, or create one. Names are matched
 * case-insensitively and trimmed so "Sara" and "sara " are the same student.
 */
export async function findOrCreateStudent(
  supabase: SupabaseClient,
  userId: string,
  rawName: string,
): Promise<Student> {
  const name = rawName.trim();

  const { data: existing, error: findError } = await supabase
    .from("students")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing as Student;

  const { data: created, error: insertError } = await supabase
    .from("students")
    .insert({ user_id: userId, name })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created as Student;
}

/**
 * Create one or more sessions for a student. Duplicates (same student, date
 * and time) are ignored so re-booking a recurring slot is idempotent.
 * Returns the number of new sessions actually inserted.
 */
export async function createSessions(
  supabase: SupabaseClient,
  params: {
    userId: string;
    studentId: string;
    dateKeys: string[];
    startTime: string; // 'HH:MM'
    recurrenceGroup: string | null;
  },
): Promise<number> {
  const rows = params.dateKeys.map((dateKey) => ({
    user_id: params.userId,
    student_id: params.studentId,
    session_date: dateKey,
    start_time: params.startTime,
    recurrence_group: params.recurrenceGroup,
  }));

  const { data, error } = await supabase
    .from("sessions")
    .upsert(rows, {
      onConflict: "student_id,session_date,start_time",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

/** All sessions in the given month, with the student's name attached. */
export async function fetchMonthSessions(
  supabase: SupabaseClient,
  year: number,
  month: number,
): Promise<SessionWithStudent[]> {
  const start = toDateKey(new Date(year, month, 1));
  const end = toDateKey(new Date(year, month, daysInMonth(year, month)));

  const { data, error } = await supabase
    .from("sessions")
    .select("*, students(name)")
    .gte("session_date", start)
    .lte("session_date", end)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SessionWithStudent[];
}

/** All students for the current user, ordered by name. */
export async function fetchStudents(
  supabase: SupabaseClient,
): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Student[];
}

export async function setSessionCompleted(
  supabase: SupabaseClient,
  sessionId: string,
  completed: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({ completed })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function deleteSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

/** Updates a single session occurrence's student, time, and/or date. */
export async function updateSession(
  supabase: SupabaseClient,
  sessionId: string,
  updates: { studentId: string; startTime: string; sessionDate: string },
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({
      student_id: updates.studentId,
      start_time: updates.startTime,
      session_date: updates.sessionDate,
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export type SeriesUpdateResult = {
  updated: number;
  skipped: { sessionDate: string; reason: string }[];
};

/**
 * Updates every session in a recurring series from `fromDate` onward (this
 * occurrence and every future one — never past ones) to a new student and/or
 * time. Applied one row at a time so a single conflict (e.g. the new student
 * already has a session booked at that exact slot) only skips that one
 * occurrence instead of failing the whole series.
 */
export async function updateSeriesFromDate(
  supabase: SupabaseClient,
  params: {
    recurrenceGroup: string;
    fromDate: string;
    studentId: string;
    startTime: string;
  },
): Promise<SeriesUpdateResult> {
  const { data: rows, error: fetchError } = await supabase
    .from("sessions")
    .select("id, session_date")
    .eq("recurrence_group", params.recurrenceGroup)
    .gte("session_date", params.fromDate);

  if (fetchError) throw fetchError;

  const result: SeriesUpdateResult = { updated: 0, skipped: [] };

  for (const row of (rows ?? []) as { id: string; session_date: string }[]) {
    const { error } = await supabase
      .from("sessions")
      .update({ student_id: params.studentId, start_time: params.startTime })
      .eq("id", row.id);

    if (error) {
      result.skipped.push({
        sessionDate: row.session_date,
        reason:
          error.code === "23505"
            ? "already has a session booked at that time"
            : error.message,
      });
    } else {
      result.updated++;
    }
  }

  return result;
}

export type RecurringSeries = {
  recurrenceGroup: string;
  studentId: string;
  studentName: string;
  weekday: number; // 0 (Sun) - 6 (Sat)
  startTime: string;
  occurrenceCount: number;
};

/**
 * Every distinct recurring series that had at least one session in the given
 * month — one entry per recurrence_group, using its earliest date in the
 * month to determine the weekday/time pattern. Used to offer "duplicate to
 * next month".
 */
export async function fetchRecurringSeries(
  supabase: SupabaseClient,
  year: number,
  month: number,
): Promise<RecurringSeries[]> {
  const sessions = await fetchMonthSessions(supabase, year, month);
  const groups = new Map<string, SessionWithStudent[]>();

  for (const s of sessions) {
    if (!s.recurrence_group) continue;
    const list = groups.get(s.recurrence_group) ?? [];
    list.push(s);
    groups.set(s.recurrence_group, list);
  }

  const series: RecurringSeries[] = [];
  for (const [recurrenceGroup, rows] of groups) {
    rows.sort((a, b) => a.session_date.localeCompare(b.session_date));
    const first = rows[0];
    series.push({
      recurrenceGroup,
      studentId: first.student_id,
      studentName: first.students?.name ?? "Unknown",
      weekday: fromDateKey(first.session_date).getDay(),
      startTime: first.start_time,
      occurrenceCount: rows.length,
    });
  }

  series.sort((a, b) => a.studentName.localeCompare(b.studentName));
  return series;
}

export type { Session };
