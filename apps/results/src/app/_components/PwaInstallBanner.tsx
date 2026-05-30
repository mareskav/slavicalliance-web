"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, X } from "lucide-react"

// Persisted via localStorage so the banner stays dismissed across sessions.
const DISMISS_KEY = "slavicalliance.pwaBanner.dismissed.v1"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const buffer = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i)
  }
  return buffer
}

function detectPlatform(): "ios" | "android" | "other" {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return "ios"
  if (/android/i.test(ua)) return "android"
  return "other"
}

function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

export function PwaInstallBanner() {
  const [show, setShow] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default")
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (window.innerWidth >= 768) return
    if (localStorage.getItem(DISMISS_KEY)) return
    if (isStandaloneMode()) return

    setIsIos(detectPlatform() === "ios")

    if ("Notification" in window) {
      setNotifPermission(Notification.permission)
    }

    setShow(true)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1")
    setShow(false)
  }

  const handleInstall = async () => {
    const prompt = promptRef.current
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    promptRef.current = null
    setCanInstall(false)
    if (outcome === "accepted") dismiss()
  }

  const handleSubscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Tvůj prohlížeč nepodporuje push notifikace.")
      return
    }

    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setNotifPermission(permission)
      if (permission !== "granted") return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
      if (!vapidKey) {
        console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.")
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })

      const platform = detectPlatform()
      await fetch("/vysledky/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          platform,
          userAgent: navigator.userAgent,
          teamName: null,
          notificationType: "results"
        })
      })

      setSubscribed(true)
    } catch (err) {
      console.error("Push subscription failed:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  const notifBlocked = notifPermission === "denied"
  const showNotifButton = !notifBlocked && !subscribed && "Notification" in window

  return (
    <div
      role="banner"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#08111b]/95 px-4 pb-safe pb-4 pt-3 shadow-2xl backdrop-blur-sm sm:hidden"
    >
      <button
        onClick={dismiss}
        aria-label="Zavřít banner"
        className="absolute right-3 top-3 rounded p-1 text-white/40 hover:text-white/80"
      >
        <X size={16} />
      </button>

      <p className="mb-2 pr-6 text-xs font-semibold uppercase tracking-wide text-white/40">
        Slavic Alliance
      </p>

      {isIos && (
        <p className="mb-3 text-sm text-white/70">
          Pro přidání na plochu klepni na{" "}
          <strong className="text-white">Sdílet ↑</strong> a vyber{" "}
          <strong className="text-white">„Přidat na plochu"</strong>.
        </p>
      )}

      {!isIos && canInstall && (
        <button
          onClick={handleInstall}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600/25 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-blue-500/40 hover:bg-blue-600/40 active:scale-95"
        >
          Nainstalovat aplikaci
        </button>
      )}

      {showNotifButton && (
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#26577c]/40 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-[#26577c]/60 hover:bg-[#26577c]/60 active:scale-95 disabled:opacity-60"
        >
          <Bell size={15} />
          {loading ? "Probíhá…" : "Zapnout notifikace o výsledcích"}
        </button>
      )}

      {subscribed && (
        <p className="text-center text-sm text-emerald-400">Notifikace jsou zapnuty ✓</p>
      )}

      {notifBlocked && (
        <p className="text-center text-xs text-white/40">
          Notifikace jsou blokovány nastavením prohlížeče.
        </p>
      )}
    </div>
  )
}
