"use client"

import { useEffect } from "react"

// Registers the root-scope service worker once per page load.
// Must be a client component; renders nothing.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("Service worker registration failed:", err)
    })
  }, [])

  return null
}
