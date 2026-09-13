"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on every page load. This has to happen
 * before push subscriptions can be created, so it's mounted once in the
 * authenticated app layout.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
