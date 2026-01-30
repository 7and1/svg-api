"use client";

import { useEffect } from "react";

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration.scope);

          // Register background sync for favorites
          const syncRegistration = (registration as { sync?: { register: (tag: string) => Promise<void> } }).sync;
          if (syncRegistration) {
            syncRegistration
              .register("sync-favorites")
              .catch((err) =>
                console.log("Background sync registration failed:", err)
              );
          }

          // Handle service worker updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New version available, notify user or skip waiting
                  console.log("New service worker available");
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log("SW registration failed:", error);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SYNC_FAVORITES") {
          // Trigger favorites sync from IndexedDB
          window.dispatchEvent(new CustomEvent("sync-favorites"));
        }
      });

      // Reload page when service worker updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
};
