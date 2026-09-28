import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Loaded globally (cheap — these only apply where a page opts in via
// font-display / font-body / font-mono utility classes) so the landing page
// at "/" can use them without every other screen changing font.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Teacher Scheduler",
  description: "Book tutoring sessions and track attendance across the month.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    // iOS uses this specifically for the home-screen icon; it does not
    // reliably read the SVG icon from the web manifest the way Chrome does.
    apple: "/apple-touch-icon.png",
  },
  // iOS Safari needs these explicit tags (rather than just the manifest) to
  // treat the app as a proper standalone, installable PWA. This matters
  // because Web Push on iOS only works for apps added to the home screen.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Scheduler",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b6cf6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
