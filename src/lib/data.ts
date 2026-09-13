import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session, SessionWithStudent, Student } from "@/lib/types";
import { daysInMonth, toDateKey } from "@/lib/dates";

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

export type { Session };
