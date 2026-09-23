export type Student = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  student_id: string;
  session_date: string; // 'YYYY-MM-DD'
  start_time: string; // 'HH:MM:SS'
  completed: boolean;
  recurrence_group: string | null;
  created_at: string;
};

// A session joined with its student's name, used by the calendar view.
export type SessionWithStudent = Session & {
  students: { name: string } | null;
};

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "exempt";

export type Subscription = {
  user_id: string;
  status: SubscriptionStatus;
  trial_ends_at: string;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};
