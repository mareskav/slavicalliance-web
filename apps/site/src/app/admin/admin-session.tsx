"use client"

import { FormEvent, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { ADMIN_TABS } from "./pages-config"

type LoadState = "checking" | "login" | "ready"

const fetchAuthenticated = async (): Promise<boolean> => {
  const response = await fetch("/api/admin/session")

  if (!response.ok) {
    return false
  }

  const session = await response.json()
  return Boolean(session.authenticated)
}

const AdminSessionProvider = ({ children }: { children: ReactNode }) => {
  const [loadState, setLoadState] = useState<LoadState>("checking")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const pathname = usePathname()

  useEffect(() => {
    fetchAuthenticated()
      .then((authenticated) => setLoadState(authenticated ? "ready" : "login"))
      .catch(() => setLoadState("login"))
  }, [])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        setError("Neplatné heslo.")
        return
      }

      const payload = await response.json().catch(() => null)
      setError(payload?.error || `Login endpoint vrátil HTTP ${response.status}.`)
      return
    }

    setPassword("")
    setLoadState((await fetchAuthenticated()) ? "ready" : "login")
  }

  const handleLogout = async () => {
    const response = await fetch("/api/admin/logout", { method: "POST" })

    if (!response.ok) {
      setError("Odhlášení se nezdařilo.")
      return
    }

    window.location.assign("/")
  }

  if (loadState === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0d1218] text-white">
        Načítání...
      </main>
    )
  }

  if (loadState === "login") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0d1218] px-4 text-white">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-lg border border-white/12 bg-white/[0.04] p-6 shadow-2xl"
        >
          <h1 className="text-xl font-semibold">Admin</h1>
          <label className="mt-6 block text-sm text-white/72" htmlFor="admin-password">
            Heslo
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-white/14 bg-white px-3 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
            autoComplete="current-password"
            required
          />
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          <button
            type="submit"
            className="mt-6 h-11 w-full rounded-md bg-sky-200 font-semibold text-slate-950 hover:bg-white"
          >
            Přihlásit
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d1218] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-3 border-b border-white/12 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-md border border-white/14 p-0.5">
            {ADMIN_TABS.map((tab) => {
              const href = `/admin/${tab.slug}`
              const isActive = pathname === href

              return (
                <Link
                  key={tab.slug}
                  href={href}
                  className={
                    isActive
                      ? "flex h-9 flex-1 items-center justify-center rounded px-3 text-sm font-semibold bg-white/12 text-white sm:flex-none"
                      : "flex h-9 flex-1 items-center justify-center rounded px-3 text-sm text-white/70 hover:bg-white/8 sm:flex-none"
                  }
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
          <button
            onClick={handleLogout}
            className="h-10 flex-1 rounded-md border border-white/14 px-4 text-sm text-white/76 hover:bg-white/8 sm:flex-none"
          >
            Odhlásit
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {children}
      </div>
    </main>
  )
}

export default AdminSessionProvider
