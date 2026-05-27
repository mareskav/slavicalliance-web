"use client"

import { FormEvent, useEffect, useState } from "react"

type LoadState = "checking" | "login" | "ready"
type SaveState = "idle" | "saving" | "saved" | "error"

const AdminEditor = () => {
  const [loadState, setLoadState] = useState<LoadState>("checking")
  const [password, setPassword] = useState("")
  const [content, setContent] = useState("")
  const [error, setError] = useState("")
  const [saveState, setSaveState] = useState<SaveState>("idle")

  const loadFile = async () => {
    const sessionResponse = await fetch("/api/admin/session")

    if (!sessionResponse.ok) {
      setLoadState("login")
      return
    }

    const session = await sessionResponse.json()
    if (!session.authenticated) {
      setLoadState("login")
      return
    }

    const response = await fetch("/api/content/pages/landing")

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error || "Soubor se nepodarilo nacist.")
    }

    const payload = await response.json()
    setContent(payload.raw)
    setLoadState("ready")
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadFile().catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Soubor se nepodarilo nacist.")
        setLoadState("login")
      })
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    })

    if (!response.ok) {
      if (response.status === 401) {
        setError("Neplatné heslo.")
        return
      }

      const payload = await response.json().catch(() => null)
      setError(payload?.error || `Login endpoint vratil HTTP ${response.status}.`)
      return
    }

    setPassword("")
    await loadFile()
  }

  const handleSave = async () => {
    setSaveState("saving")
    setError("")

    const response = await fetch("/api/admin/content/pages/landing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: content })
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(payload?.error || "Ulozeni se nezdarilo.")
      setSaveState("error")
      return
    }

    setSaveState("saved")
  }

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    setLoadState("login")
    setContent("")
  }

  if (loadState === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0d1218] text-white">
        Nacitani...
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
            Prihlasit
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d1218] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/12 pb-4">
          <div>
            <h1 className="text-xl font-semibold">Domácí stránka</h1>
            <p className="mt-1 text-sm text-white/58">contents/pages/landing.md</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="h-10 rounded-md border border-white/14 px-4 text-sm text-white/76 hover:bg-white/8"
            >
              Odhlásit
            </button>
            <button
              onClick={handleSave}
              disabled={saveState === "saving"}
              className="h-10 rounded-md bg-sky-200 px-5 text-sm font-semibold text-slate-950 hover:bg-white disabled:cursor-wait disabled:opacity-70"
            >
              {saveState === "saving" ? "Ukládám..." : "Uložit"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {saveState === "saved" ? (
          <p className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Soubor uložen a aktualizován.
          </p>
        ) : null}

        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value)
            setSaveState("idle")
          }}
          spellCheck={false}
          className="mt-5 min-h-[72vh] flex-1 resize-none rounded-md border border-white/12 bg-[#05070c] p-4 font-mono text-sm leading-6 text-white outline-none ring-sky-300/30 focus:ring-4"
        />
      </div>
    </main>
  )
}

export default AdminEditor
