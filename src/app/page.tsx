import Link from "next/link";

/**
 * Public landing page. Middleware treats "/" as the one route that's public
 * without a session, and bounces signed-in users straight to /calendar (see
 * src/lib/supabase/middleware.ts) — so by the time this renders, only a
 * logged-out visitor is looking at it. No client-side JS needed here at all.
 */

const INK = "#14231C"; // chalkboard — hero + closing band
const PAPER = "#F2EFE4"; // notebook page — body sections
const CHALK = "#F7F5EE"; // off-white text on the dark bands
const PINE = "#1F3B2E"; // headline/body text on paper
const GOLD = "#C98A2B"; // the one accent — CTAs, numerals, small marks
const LINE = "#D8D3C4"; // hairline rule color on paper sections

const STEPS = [
  {
    n: "01",
    title: "Create your account",
    body: "Sign up with your email. Your 7-day trial starts right away — no card, no waiting on approval.",
  },
  {
    n: "02",
    title: "Book the week",
    body: "Add a session, tick “repeat weekly,” and it's booked on the same day and time for the rest of the month.",
  },
  {
    n: "03",
    title: "Mark who showed up",
    body: "One matrix — every student down the side, every date across the top — so attendance never lives in a separate notebook.",
  },
];

const FEATURES = [
  {
    title: "Weekly recurrence",
    body: "Tick one box and a session repeats on the same day and time through the end of the month. Change your mind later — edit just one occurrence, or the whole series.",
  },
  {
    title: "Attendance matrix",
    body: "Every student down the side, every session date across the top. Tick a box, and you know who showed up.",
  },
  {
    title: "Edit without starting over",
    body: "Change a student, a date, or a time after the fact — for one session, or every future one in a recurring series.",
  },
  {
    title: "Carry a class into next month",
    body: "Duplicate a month's recurring sessions with one click. A checklist comes first, so you can drop anyone who isn't continuing.",
  },
  {
    title: "Optional push reminders",
    body: "A nudge 10-15 minutes before each session, on your phone or your laptop. Free to run — no app store involved.",
  },
  {
    title: "Private by default",
    body: "Postgres row-level security means you only ever see your own students and sessions — enforced at the database, not just the interface.",
  },
];

const IOS_STEPS: { caption: string; icon: "share" | "add" | "check" }[] = [
  { caption: "Tap the Share icon in Safari's toolbar", icon: "share" },
  { caption: "Scroll down and tap “Add to Home Screen”", icon: "add" },
  { caption: "Tap “Add” in the top right corner", icon: "check" },
];

const ANDROID_STEPS: { caption: string; icon: "more" | "install" | "check" }[] = [
  { caption: "Tap the ⋮ menu in the top right of Chrome", icon: "more" },
  { caption: "Tap “Install app” (or “Add to Home screen”)", icon: "install" },
  { caption: "Tap “Install” to confirm", icon: "check" },
];

const FAQ = [
  {
    q: "What happens when the trial ends?",
    a: "You'll be asked to subscribe to keep booking sessions and tracking attendance. Nothing you've entered gets deleted — subscribing picks up exactly where you left off.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, anytime. Paddle handles billing for us and includes a manage-subscription link in the receipt it emails you when you subscribe.",
  },
  {
    q: "Is my data private?",
    a: "Yes — every tutor only ever sees their own students and sessions, enforced at the database level, not just in the app.",
  },
];

function CTAButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-[#14231C] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ backgroundColor: GOLD, "--tw-ring-color": GOLD } as React.CSSProperties}
    >
      {children}
    </Link>
  );
}

function InstallIcon({ name }: { name: "share" | "add" | "check" | "more" | "install" }) {
  const common = { width: 22, height: 22, viewBox: "0 0 22 22", fill: "none" as const };
  switch (name) {
    case "share":
      return (
        <svg {...common}>
          <path d="M11 2v11" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 6l4-4 4 4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 11v7a1 1 0 001 1h12a1 1 0 001-1v-7" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "add":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="18" height="18" rx="5" stroke={GOLD} strokeWidth="1.5" />
          <path d="M11 7v8M7 11h8" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="11" cy="4.5" r="1.4" fill={GOLD} />
          <circle cx="11" cy="11" r="1.4" fill={GOLD} />
          <circle cx="11" cy="17.5" r="1.4" fill={GOLD} />
        </svg>
      );
    case "install":
      return (
        <svg {...common}>
          <path d="M11 2v11" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 9l4 4 4-4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 15v3a1 1 0 001 1h12a1 1 0 001-1v-3" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "check":
    default:
      return (
        <svg {...common}>
          <path d="M5 11.5l4 4 8-9" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function InstallStep({
  step,
  caption,
  icon,
}: {
  step: number;
  caption: string;
  icon: "share" | "add" | "check" | "more" | "install";
}) {
  return (
    <div
      className="flex w-36 flex-shrink-0 flex-col items-center rounded-[24px] border px-4 py-6 text-center sm:w-40"
      style={{ borderColor: LINE, backgroundColor: "#FFFFFF" }}
    >
      <span className="font-display text-sm" style={{ color: GOLD }}>
        {step}
      </span>
      <div
        className="mt-3 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: PAPER }}
      >
        <InstallIcon name={icon} />
      </div>
      <p className="mt-4 text-xs leading-snug" style={{ color: PINE, opacity: 0.8 }}>
        {caption}
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="font-body">
      {/* ---------- header + hero (chalkboard) ---------- */}
      <div style={{ backgroundColor: INK }}>
        <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="18" height="18" rx="4" stroke={GOLD} strokeWidth="1.5" />
              <path d="M5.5 10.5l3 3 6-7" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-display text-lg" style={{ color: CHALK }}>
              Teacher Scheduler
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm sm:flex" style={{ color: CHALK }}>
            <a href="#features" className="opacity-80 transition hover:opacity-100">
              Features
            </a>
            <a href="#pricing" className="opacity-80 transition hover:opacity-100">
              Pricing
            </a>
            <Link href="/login" className="opacity-80 transition hover:opacity-100">
              Log in
            </Link>
            <CTAButton href="/signup">Start free trial</CTAButton>
          </nav>
          <Link
            href="/signup"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#14231C] sm:hidden"
            style={{ backgroundColor: GOLD }}
          >
            Start trial
          </Link>
        </header>

        <div className="mx-auto grid max-w-5xl gap-10 px-6 pb-20 pt-6 md:grid-cols-[1.1fr_1fr] md:items-center md:pb-28">
          {/* left: headline */}
          <div>
            <h1
              className="font-display text-4xl leading-[1.1] sm:text-5xl md:text-6xl"
              style={{ color: CHALK }}
            >
              Book the week once.
              <br />
              Know who showed up after.
            </h1>
            <p className="mt-6 max-w-md text-lg" style={{ color: CHALK, opacity: 0.82 }}>
              A calendar built for private tutors — book a session, tick “repeat
              weekly,” and it books itself through the month. Free for 7 days,
              then $10 a month.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <CTAButton href="/signup">Start your free trial</CTAButton>
              <Link
                href="/login"
                className="text-sm font-medium underline-offset-4 hover:underline"
                style={{ color: CHALK }}
              >
                Log in
              </Link>
            </div>
            <p className="mt-4 text-sm" style={{ color: CHALK, opacity: 0.55 }}>
              No card needed to start.
            </p>
          </div>

          {/* right: bespoke week-view mockup */}
          <div
            className="motion-safe:animate-[hero-card-in_0.6s_ease-out] rounded-[20px] p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.45)]"
            style={{ backgroundColor: PAPER }}
          >
            <div className="grid grid-cols-5 gap-2 text-center text-xs font-medium" style={{ color: PINE, opacity: 0.6 }}>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
            </div>
            <div className="mt-3 h-px w-full" style={{ backgroundColor: LINE }} />

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: "#FFFFFF" }}>
                <span className="text-sm font-medium" style={{ color: PINE }}>
                  Mona
                </span>
                <span className="font-mono text-xs" style={{ color: PINE, opacity: 0.65 }}>
                  4:00
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: "#FFFFFF" }}>
                <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: PINE }}>
                  Youssef
                  <span
                    className="motion-safe:animate-pulse inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: GOLD }}
                    aria-hidden="true"
                  />
                </span>
                <span className="font-mono text-xs" style={{ color: PINE, opacity: 0.65 }}>
                  5:30 ↻ weekly
                </span>
              </div>
            </div>

            <div className="mt-4 h-px w-full" style={{ backgroundColor: LINE }} />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: PINE, opacity: 0.6 }}>
                Attendance
              </span>
              <div className="flex gap-1.5">
                {[true, true, true, false, true].map((done, i) => (
                  <span
                    key={i}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                    style={{
                      backgroundColor: done ? GOLD : "transparent",
                      border: done ? "none" : `1px solid ${LINE}`,
                      color: done ? INK : "transparent",
                    }}
                  >
                    ✓
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* torn-edge seam into the paper section below */}
        <svg
          viewBox="0 0 1440 32"
          preserveAspectRatio="none"
          className="block h-6 w-full md:h-8"
          aria-hidden="true"
        >
          <path
            d="M0,0 L60,20 L120,4 L180,22 L240,2 L300,18 L360,6 L420,24 L480,0 L540,20 L600,4 L660,22 L720,2 L780,18 L840,6 L900,24 L960,0 L1020,20 L1080,4 L1140,22 L1200,2 L1260,18 L1320,6 L1380,24 L1440,0 L1440,32 L0,32 Z"
            fill={PAPER}
          />
        </svg>
      </div>

      {/* ---------- how it works (paper) ---------- */}
      <section className="px-6 py-20" style={{ backgroundColor: PAPER }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl" style={{ color: PINE }}>
            How it works
          </h2>
          <div className="mt-10 space-y-8">
            {STEPS.map((step) => (
              <div key={step.n} className="flex gap-5">
                <span className="font-display text-3xl" style={{ color: GOLD }}>
                  {step.n}
                </span>
                <div className="pt-1">
                  <h3 className="text-base font-semibold" style={{ color: PINE }}>
                    {step.title}
                  </h3>
                  <p className="mt-1 max-w-lg text-sm leading-relaxed" style={{ color: PINE, opacity: 0.75 }}>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section id="features" className="px-6 py-20" style={{ backgroundColor: PAPER }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl" style={{ color: PINE }}>
            What it does
          </h2>
          <div className="mt-8">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="flex flex-col gap-2 border-t py-6 sm:flex-row sm:gap-10"
                style={{ borderColor: LINE }}
              >
                <h3
                  className={`text-base font-semibold sm:w-56 sm:flex-shrink-0 ${
                    i % 2 === 1 ? "sm:order-2 sm:text-right" : ""
                  }`}
                  style={{ color: PINE }}
                >
                  {feature.title}
                </h3>
                <p className="max-w-lg text-sm leading-relaxed" style={{ color: PINE, opacity: 0.75 }}>
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- install as an app ---------- */}
      <section className="px-6 py-20" style={{ backgroundColor: PAPER }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl" style={{ color: PINE }}>
            Add it to your home screen
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed" style={{ color: PINE, opacity: 0.75 }}>
            Teacher Scheduler installs like a real app — no App Store needed.
            It opens full-screen and can send you a reminder before each
            session.
          </p>

          <div className="mt-10">
            <p className="text-xs font-medium" style={{ color: PINE, opacity: 0.55 }}>
              On iPhone, in Safari
            </p>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
              {IOS_STEPS.map((s, i) => (
                <InstallStep key={s.caption} step={i + 1} caption={s.caption} icon={s.icon} />
              ))}
            </div>
          </div>

          <div className="mt-10">
            <p className="text-xs font-medium" style={{ color: PINE, opacity: 0.55 }}>
              On Android, in Chrome
            </p>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
              {ANDROID_STEPS.map((s, i) => (
                <InstallStep key={s.caption} step={i + 1} caption={s.caption} icon={s.icon} />
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs" style={{ color: PINE, opacity: 0.5 }}>
            Exact wording can vary a little by phone and browser version.
          </p>
        </div>
      </section>

      {/* ---------- pricing ---------- */}
      <section id="pricing" className="px-6 py-20" style={{ backgroundColor: PAPER }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl" style={{ color: PINE }}>
            One plan, no surprises
          </h2>

          <div
            className="mt-8 rounded-[20px] border p-8"
            style={{ borderColor: PINE, backgroundColor: "#FFFFFF" }}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl" style={{ color: PINE }}>
                $10
              </span>
              <span className="text-base" style={{ color: PINE, opacity: 0.6 }}>
                / month
              </span>
            </div>
            <p className="mt-2 text-sm" style={{ color: PINE, opacity: 0.75 }}>
              After a free 7-day trial. No card required to start.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: PINE, opacity: 0.75 }}>
              Unlimited students and sessions, weekly recurrence, attendance
              tracking, editing, and push reminders — everything, always.
              There's no separate premium tier to upgrade into.
            </p>

            <div className="mt-8 space-y-5 border-t pt-6" style={{ borderColor: LINE }}>
              {FAQ.map((item) => (
                <div key={item.q}>
                  <p className="text-sm font-semibold" style={{ color: PINE }}>
                    {item.q}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: PINE, opacity: 0.75 }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <CTAButton href="/signup">Start your free trial</CTAButton>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- closing band + footer (chalkboard again) ---------- */}
      <div style={{ backgroundColor: INK }}>
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="font-display text-3xl" style={{ color: CHALK }}>
            Ready to stop tracking attendance on paper?
          </h2>
          <div className="mt-8 flex justify-center">
            <CTAButton href="/signup">Start your free trial</CTAButton>
          </div>
        </div>
        <footer className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 border-t px-6 py-6 text-sm sm:flex-row" style={{ borderColor: "rgba(247,245,238,0.12)", color: CHALK, opacity: 0.6 }}>
          <span>Teacher Scheduler</span>
          <div className="flex gap-5">
            <Link href="/login" className="hover:opacity-100">
              Log in
            </Link>
            <Link href="/signup" className="hover:opacity-100">
              Start free trial
            </Link>
          </div>
          <span>© 2026 Teacher Scheduler</span>
        </footer>
      </div>
    </main>
  );
}
