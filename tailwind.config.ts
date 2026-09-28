import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#3b6cf6",
          600: "#2f57d4",
          700: "#2745a8",
        },
      },
      fontFamily: {
        // Only used on the marketing landing page (src/app/page.tsx) — the
        // rest of the app keeps Tailwind's default sans stack untouched, so
        // this can't affect any existing screen.
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-plex)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
