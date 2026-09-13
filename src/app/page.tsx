import { redirect } from "next/navigation";

export default function Home() {
  // Middleware handles the auth check; signed-in users land on the calendar.
  redirect("/calendar");
}
