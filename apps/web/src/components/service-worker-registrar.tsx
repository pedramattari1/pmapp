"use client";

import { useEffect } from "react";
import { flushQueue } from "@/lib/offline-queue";

/** Registers the service worker and flushes the offline save queue on reconnect. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Pull any newer worker (e.g. the auth-safe fix) immediately.
          void reg.update();
        })
        .catch(() => {
          // Registration failures are non-fatal (e.g. unsupported browser).
        });
    }
    // Try to drain any queued saves now and whenever we come back online.
    void flushQueue();
    const onOnline = () => void flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
