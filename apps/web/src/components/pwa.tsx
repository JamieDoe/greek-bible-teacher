"use client";

import { useEffect, useState } from "react";

/** Registers the service worker in production builds (dev keeps Turbopack HMR untouched). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err: unknown) => console.error("[pwa] service worker registration failed", err));
  }, []);
  return null;
}

/** A quiet banner while the browser reports no connection. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <p role="status" className="bg-accent px-4 py-2 text-center text-sm">
      You’re offline. Passages you’ve read recently are still available.
    </p>
  );
}
