"use client"

import { markResultsFresh } from "@/lib/results-freshness"
import { FormEvent, useEffect, useState } from "react"

type ManualResult = {
  id: string
  teamId: number | null
  teamName: string
  quizDate: string
  points: number | null
  doplnovacek: number | null
  pub: string | null
  note: string | null
  status: "approved" | "rejected"
  submittedBy: string
  submittedAt: string
  updatedAt: string
}

type TeamOption = {
  teamId: number | null
  name: string
}

const DEFAULT_TEAM_NAME = "Slavic Alliance"

// Sentinel select value for "this team isn't in the list, let me type a name".
const CUSTOM_TEAM_VALUE = "__custom__"

// The team <select>'s value has to carry both the id and the name together:
// the same team_id can be reused under a different name over time (and vice
// versa), so neither field alone safely identifies a choice.
const encodeTeamOption = (team: TeamOption) => JSON.stringify(team)

const decodeTeamOption = (value: string): TeamOption | null => {
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === "object" && parsed !== null && typeof parsed.name === "string") {
      return { teamId: typeof parsed.teamId === "number" ? parsed.teamId : null, name: parsed.name }
    }
    return null
  } catch {
    return null
  }
}

// If the team a result is actually stored under isn't (or is no longer) in
// the fetched teams list, inject it as a synthetic option so editing that
// row doesn't silently reassign it to a different team.
const buildEditTeamOptions = (teams: TeamOption[], current: TeamOption): TeamOption[] => {
  const currentEncoded = encodeTeamOption(current)
  const hasCurrent = teams.some((team) => encodeTeamOption(team) === currentEncoded)
  return hasCurrent ? teams : [current, ...teams]
}

type FormState = {
  teamSelection: string
  customTeamName: string
  quizDate: string
  points: string
  doplnovacek: string
  pub: string
  note: string
}

const buildDefaultForm = (teams: TeamOption[]): FormState => {
  const defaultTeam = teams.find((team) => team.name === DEFAULT_TEAM_NAME)

  return {
    teamSelection: defaultTeam ? encodeTeamOption(defaultTeam) : "",
    customTeamName: "",
    quizDate: "",
    points: "",
    doplnovacek: "",
    pub: "",
    note: ""
  }
}

// Resolves the team actually selected: either a known team from the list, or
// a freshly typed ad-hoc name (teamId: null) when the custom option is chosen.
const resolveSelectedTeam = (form: FormState): TeamOption | null => {
  if (form.teamSelection === CUSTOM_TEAM_VALUE) {
    const name = form.customTeamName.trim()
    return name ? { teamId: null, name } : null
  }
  return decodeTeamOption(form.teamSelection)
}

// Mobile keyboards in the Czech locale type "46,5"; Number() would turn that into NaN (saved as null).
const parseOptionalNumber = (value: string): number | null => {
  const trimmed = value.trim().replace(",", ".")
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("cs-CZ")
  } catch {
    return iso
  }
}

// The API returns quizDate as a UTC-midnight ISO string derived from a DB
// date column, so slicing it directly can land on the previous day once
// converted to the browser's local timezone. Read it back through the same
// local-time components formatDate() displays, to keep the edit form in sync.
const toLocalIsoDate = (iso: string) => {
  const date = new Date(iso)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true
}

const PencilIcon = () => (
  <svg {...iconProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const CloseIcon = () => (
  <svg {...iconProps}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

const ManualResultsPanel = () => {
  const [results, setResults] = useState<ManualResult[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(buildDefaultForm([]))
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [pubNames, setPubNames] = useState<string[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(buildDefaultForm([]))
  const [savingEdit, setSavingEdit] = useState(false)

  const loadResults = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/manual-results", { cache: "no-store" })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Výsledky se nepodařilo načíst.")
      }

      const payload = await response.json()
      setResults(payload.results ?? [])
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Výsledky se nepodařilo načíst.")
    } finally {
      setLoading(false)
    }
  }

  const loadPubNames = async () => {
    try {
      const response = await fetch("/api/admin/pub-names", { cache: "no-store" })
      if (!response.ok) return
      const payload = await response.json()
      setPubNames(payload.pubNames ?? [])
    } catch {
      // Non-critical: the datalist just stays empty and the field still accepts free text.
    }
  }

  const loadTeams = async () => {
    try {
      const response = await fetch("/api/admin/teams", { cache: "no-store" })
      if (!response.ok) return
      const payload = await response.json()
      const loadedTeams: TeamOption[] = payload.teams ?? []
      setTeams(loadedTeams)
      setForm((prev) => (prev.teamSelection ? prev : buildDefaultForm(loadedTeams)))
    } catch {
      // Non-critical: the select just stays empty (plus whatever default form already had).
    }
  }

  useEffect(() => {
    loadResults()
    loadPubNames()
    loadTeams()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    const selectedTeam = resolveSelectedTeam(form)
    if (!selectedTeam) {
      setError(
        form.teamSelection === CUSTOM_TEAM_VALUE
          ? "Zadejte název týmu."
          : "Vyberte tým."
      )
      return
    }

    if (Number.isNaN(parseOptionalNumber(form.points)) || Number.isNaN(parseOptionalNumber(form.doplnovacek))) {
      setError("Body a doplňovačky musí být číslo.")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/admin/manual-results", {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: selectedTeam.name,
          teamId: selectedTeam.teamId,
          quizDate: form.quizDate,
          points: parseOptionalNumber(form.points),
          doplnovacek: parseOptionalNumber(form.doplnovacek),
          pub: form.pub.trim() ? form.pub.trim() : null,
          note: form.note.trim() ? form.note.trim() : null
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Uložení se nezdařilo (HTTP ${response.status}).`)
      }

      markResultsFresh()

      setForm(buildDefaultForm(teams))
      await loadResults()
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Uložení se nezdařilo.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async (id: string, teamName: string) => {
    const confirmed = window.confirm(
      `Opravdu chceš smazat výsledek týmu „${teamName}“? Tuto akci nelze v administraci vrátit zpět.`
    )
    if (!confirmed) return

    setError("")
    setRejectingId(id)

    try {
      const response = await fetch("/api/admin/manual-results", {
        method: "PATCH",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "reject" })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Zrušení se nezdařilo (HTTP ${response.status}).`)
      }

      markResultsFresh()

      await loadResults()
    } catch (rejectError: unknown) {
      setError(rejectError instanceof Error ? rejectError.message : "Zrušení se nezdařilo.")
    } finally {
      setRejectingId(null)
    }
  }

  const startEdit = (result: ManualResult) => {
    if (editingId !== null && editingId !== result.id) {
      const confirmed = window.confirm(
        "Rozpracovaná úprava jiného řádku ještě není uložená. Opravdu ji chceš zahodit a upravit tento řádek?"
      )
      if (!confirmed) return
    }

    setError("")
    setEditingId(result.id)
    setEditForm({
      teamSelection: encodeTeamOption({ teamId: result.teamId, name: result.teamName }),
      customTeamName: "",
      quizDate: toLocalIsoDate(result.quizDate),
      points: result.points !== null ? String(result.points) : "",
      doplnovacek: result.doplnovacek !== null ? String(result.doplnovacek) : "",
      pub: result.pub ?? "",
      note: result.note ?? ""
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(buildDefaultForm(teams))
  }

  const handleSaveEdit = async (id: string) => {
    setError("")

    const selectedTeam = resolveSelectedTeam(editForm)
    if (!selectedTeam) {
      setError(
        editForm.teamSelection === CUSTOM_TEAM_VALUE
          ? "Zadejte název týmu."
          : "Vyberte tým."
      )
      return
    }

    if (Number.isNaN(parseOptionalNumber(editForm.points)) || Number.isNaN(parseOptionalNumber(editForm.doplnovacek))) {
      setError("Body a doplňovačky musí být číslo.")
      return
    }

    setSavingEdit(true)

    try {
      const response = await fetch("/api/admin/manual-results", {
        method: "PATCH",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          teamName: selectedTeam.name,
          teamId: selectedTeam.teamId,
          quizDate: editForm.quizDate,
          points: parseOptionalNumber(editForm.points),
          doplnovacek: parseOptionalNumber(editForm.doplnovacek),
          pub: editForm.pub.trim() ? editForm.pub.trim() : null,
          note: editForm.note.trim() ? editForm.note.trim() : null
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Uložení se nezdařilo (HTTP ${response.status}).`)
      }

      markResultsFresh()

      // Show the saved row right away from the PATCH response; the (slow, Neon-backed)
      // list reload runs in the background so the button doesn't hang on "Ukládám...".
      const payload = await response.json().catch(() => null)
      if (payload?.result) {
        setResults((prev) => prev.map((row) => (row.id === id ? payload.result : row)))
      }

      cancelEdit()
      setSavingEdit(false)
      void loadResults()
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Uložení se nezdařilo.")
    } finally {
      setSavingEdit(false)
    }
  }

  const visibleResults = results.filter((result) => result.status !== "rejected")

  return (
    <section className="mt-4 flex flex-col gap-5">
      {error ? (
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-md border border-red-300/30 bg-red-950/95 px-3 py-2 text-sm text-red-200 shadow-lg">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Zavřít"
            className="shrink-0 rounded-md px-1 text-red-200/70 hover:text-red-100"
          >
            ✕
          </button>
        </div>
      ) : null}

      <p className="rounded-md border border-amber-300/24 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
        Ručně zadaný výsledek se hned zobrazí na stránce Slavic Alliance (či zvoleného týmu) s
        ostatními výsledky. Do žebříčků lig (Praha finále, dlouhodobé i speciální ligy) se ale
        ZATÍM nezapočítává — historicky zatím neumíme dopočítat, do které ligy a kola by patřil,
        proto je vidět jen u konkrétního týmu.
      </p>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-md border border-white/12 bg-white/[0.04] p-4 sm:grid-cols-2"
      >
        <h2 className="col-span-full text-base font-semibold text-white">Nový výsledek</h2>

        <label className="flex min-w-0 flex-col gap-1 text-sm text-white/72">
          Název týmu *
          <select
            value={form.teamSelection}
            onChange={(event) => setForm((prev) => ({ ...prev, teamSelection: event.target.value }))}
            className="h-10 rounded-md border border-white/14 bg-white px-3 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
            required
          >
            <option value="" disabled>
              Vyberte tým
            </option>
            {teams.map((team) => (
              <option key={encodeTeamOption(team)} value={encodeTeamOption(team)}>
                {team.name}
              </option>
            ))}
            <option value={CUSTOM_TEAM_VALUE}>Jiný tým (nový název)…</option>
          </select>
        </label>

        {form.teamSelection === CUSTOM_TEAM_VALUE ? (
          <label className="flex min-w-0 flex-col gap-1 text-sm text-white/72">
            Název nového týmu *
            <input
              type="text"
              value={form.customTeamName}
              onChange={(event) => setForm((prev) => ({ ...prev, customTeamName: event.target.value }))}
              placeholder="Zadej název týmu"
              className="h-10 rounded-md border border-white/14 bg-white px-3 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
              required
            />
          </label>
        ) : null}

        <label className="flex min-w-0 flex-col gap-1 text-sm text-white/72">
          Datum kvízu *
          <input
            type="date"
            value={form.quizDate}
            onChange={(event) => setForm((prev) => ({ ...prev, quizDate: event.target.value }))}
            className="h-10 rounded-md border border-white/14 bg-white px-3 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
            required
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-sm text-white/72">
          Body
          <input
            type="text"
                          inputMode="decimal"
            min={0}
            step="0.5"
            value={form.points}
            onChange={(event) => setForm((prev) => ({ ...prev, points: event.target.value }))}
            className="h-10 rounded-md border border-white/14 bg-white px-3 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-sm text-white/72">
          Doplňovačky
          <input
            type="text"
                          inputMode="decimal"
            min={0}
            step="1"
            value={form.doplnovacek}
            onChange={(event) => setForm((prev) => ({ ...prev, doplnovacek: event.target.value }))}
            className="h-10 rounded-md border border-white/14 bg-white px-3 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-sm text-white/72">
          Hospoda
          <input
            type="text"
            list="pub-names-list"
            value={form.pub}
            onChange={(event) => setForm((prev) => ({ ...prev, pub: event.target.value }))}
            className="h-10 rounded-md border border-white/14 bg-white px-3 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
          />
        </label>

        <label className="col-span-full flex min-w-0 flex-col gap-1 text-sm text-white/72">
          Poznámka
          <textarea
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            rows={2}
            className="rounded-md border border-white/14 bg-white px-3 py-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
          />
        </label>

        <datalist id="pub-names-list">
          {pubNames.map((pubName) => (
            <option key={pubName} value={pubName} />
          ))}
        </datalist>

        <button
          type="submit"
          disabled={submitting}
          className="col-span-full h-10 rounded-md bg-sky-200 px-5 text-sm font-semibold text-slate-950 hover:bg-white disabled:cursor-wait disabled:opacity-70 sm:justify-self-start"
        >
          {submitting ? "Ukládám..." : "Přidat výsledek"}
        </button>
      </form>

      <div className="rounded-md border border-white/12 bg-[#05070c]">
        <h2 className="border-b border-white/12 p-4 text-base font-semibold text-white">
          Zadané výsledky
        </h2>

        {loading ? (
          <p className="p-4 text-sm text-white/58">Načítání...</p>
        ) : visibleResults.length === 0 ? (
          <p className="p-4 text-sm text-white/58">Zatím žádné ručně zadané výsledky.</p>
        ) : (
          <>
            {/* Card layout avoids sideways-scrolling a wide table on narrow screens. */}
            <div className="flex flex-col gap-3 p-3 sm:hidden">
              {visibleResults.map((result) =>
                editingId === result.id ? (
                  <div key={result.id} className="flex flex-col gap-2 rounded-md border border-white/14 bg-white/[0.04] p-3">
                    <label className="flex flex-col gap-1 text-xs text-white/58">
                      Datum
                      <input
                        type="date"
                        value={editForm.quizDate}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, quizDate: event.target.value }))}
                        className="h-9 rounded-md border border-white/14 bg-white px-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-white/58">
                      Tým
                      <select
                        value={editForm.teamSelection}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, teamSelection: event.target.value }))}
                        className="h-9 rounded-md border border-white/14 bg-white px-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                      >
                        {buildEditTeamOptions(teams, { teamId: result.teamId, name: result.teamName }).map((team) => (
                          <option key={encodeTeamOption(team)} value={encodeTeamOption(team)}>
                            {team.name}
                          </option>
                        ))}
                        <option value={CUSTOM_TEAM_VALUE}>Jiný tým (nový název)…</option>
                      </select>
                    </label>
                    {editForm.teamSelection === CUSTOM_TEAM_VALUE ? (
                      <label className="flex flex-col gap-1 text-xs text-white/58">
                        Název nového týmu
                        <input
                          type="text"
                          value={editForm.customTeamName}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, customTeamName: event.target.value }))
                          }
                          placeholder="Zadej název týmu"
                          className="h-9 rounded-md border border-white/14 bg-white px-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                        />
                      </label>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 text-xs text-white/58">
                        Body
                        <input
                          type="text"
                          inputMode="decimal"
                          min={0}
                          step="0.5"
                          value={editForm.points}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, points: event.target.value }))}
                          className="h-9 rounded-md border border-white/14 bg-white px-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-white/58">
                        Doplňovačky
                        <input
                          type="text"
                          inputMode="decimal"
                          min={0}
                          step="1"
                          value={editForm.doplnovacek}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, doplnovacek: event.target.value }))}
                          className="h-9 rounded-md border border-white/14 bg-white px-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1 text-xs text-white/58">
                      Hospoda
                      <input
                        type="text"
                        list="pub-names-list"
                        value={editForm.pub}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, pub: event.target.value }))}
                        className="h-9 rounded-md border border-white/14 bg-white px-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-white/58">
                      Poznámka
                      <textarea
                        value={editForm.note}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, note: event.target.value }))}
                        rows={2}
                        className="rounded-md border border-white/14 bg-white px-2 py-1 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                      />
                    </label>
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(result.id)}
                        disabled={savingEdit}
                        aria-label="Uložit"
                        title="Uložit"
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-sky-300/24 text-sm font-semibold text-sky-200 hover:bg-sky-500/10 disabled:cursor-wait disabled:opacity-70"
                      >
                        <CheckIcon />
                        {savingEdit ? "Ukládám..." : null}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={savingEdit}
                        aria-label="Zrušit úpravy"
                        title="Zrušit úpravy"
                        className="flex h-10 w-12 items-center justify-center rounded-md border border-white/24 text-white/72 hover:bg-white/10 disabled:cursor-wait disabled:opacity-70"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={result.id} className="rounded-md border border-white/12 bg-white/[0.02] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{result.teamName}</div>
                        <div className="text-xs text-white/58">{formatDate(result.quizDate)}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(result)}
                          aria-label={`Upravit výsledek ${result.teamName}`}
                          title="Upravit"
                          className="flex h-10 w-10 items-center justify-center rounded-md border border-white/24 text-white/72 hover:bg-white/10"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(result.id, result.teamName)}
                          disabled={rejectingId === result.id}
                          aria-label={`Vymazat výsledek ${result.teamName}`}
                          title="Vymazat"
                          className="flex h-10 w-10 items-center justify-center rounded-md border border-red-300/24 text-red-200 hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-70"
                        >
                          {rejectingId === result.id ? "…" : <TrashIcon />}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-white">
                      <div>
                        <span className="text-white/45">Body: </span>
                        {result.points ?? "-"}
                      </div>
                      <div>
                        <span className="text-white/45">Doplňovačky: </span>
                        {result.doplnovacek ?? "-"}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-white/78">{result.pub ?? "-"}</div>
                    {result.note ? <div className="mt-1 text-sm text-white/58">{result.note}</div> : null}
                  </div>
                )
              )}
            </div>

            <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-150 text-left text-sm">
              <thead className="border-b border-white/12 text-xs uppercase text-white/45">
                <tr>
                  <th className="px-3 py-2 font-semibold">Datum</th>
                  <th className="px-3 py-2 font-semibold">Tým</th>
                  <th className="px-3 py-2 text-right font-semibold">Body</th>
                  <th className="px-3 py-2 text-right font-semibold">Doplňovačky</th>
                  <th className="px-3 py-2 font-semibold">Hospoda</th>
                  <th className="px-3 py-2 font-semibold">Poznámka</th>
                  <th className="px-3 py-2 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {visibleResults.map((result) =>
                  editingId === result.id ? (
                    <tr key={result.id} className="bg-white/[0.03]">
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={editForm.quizDate}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, quizDate: event.target.value }))
                          }
                          className="h-8 w-full rounded-md border border-white/14 bg-white px-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={editForm.teamSelection}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, teamSelection: event.target.value }))
                          }
                          className="h-8 w-full rounded-md border border-white/14 bg-white px-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                        >
                          {buildEditTeamOptions(teams, { teamId: result.teamId, name: result.teamName }).map(
                            (team) => (
                              <option key={encodeTeamOption(team)} value={encodeTeamOption(team)}>
                                {team.name}
                              </option>
                            )
                          )}
                          <option value={CUSTOM_TEAM_VALUE}>Jiný tým (nový název)…</option>
                        </select>
                        {editForm.teamSelection === CUSTOM_TEAM_VALUE ? (
                          <input
                            type="text"
                            value={editForm.customTeamName}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, customTeamName: event.target.value }))
                            }
                            placeholder="Název nového týmu"
                            className="mt-1 h-8 w-full rounded-md border border-white/14 bg-white px-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                          />
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          min={0}
                          step="0.5"
                          value={editForm.points}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, points: event.target.value }))
                          }
                          className="h-8 w-full rounded-md border border-white/14 bg-white px-2 text-right text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          min={0}
                          step="1"
                          value={editForm.doplnovacek}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, doplnovacek: event.target.value }))
                          }
                          className="h-8 w-full rounded-md border border-white/14 bg-white px-2 text-right text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          list="pub-names-list"
                          value={editForm.pub}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, pub: event.target.value }))
                          }
                          className="h-8 w-full rounded-md border border-white/14 bg-white px-2 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          value={editForm.note}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, note: event.target.value }))
                          }
                          rows={2}
                          className="w-full rounded-md border border-white/14 bg-white px-2 py-1 text-slate-950 outline-none ring-sky-300/40 focus:ring-4"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(result.id)}
                          disabled={savingEdit}
                          className="h-8 rounded-md border border-sky-300/24 px-3 text-xs font-semibold text-sky-200 hover:bg-sky-500/10 disabled:cursor-wait disabled:opacity-70"
                        >
                          {savingEdit ? "Ukládám..." : "Uložit"}
                        </button>{" "}
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={savingEdit}
                          className="h-8 rounded-md border border-white/24 px-3 text-xs font-semibold text-white/72 hover:bg-white/10 disabled:cursor-wait disabled:opacity-70"
                        >
                          Zpět
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={result.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-white">
                        {formatDate(result.quizDate)}
                      </td>
                      <td className="px-3 py-2 text-white">{result.teamName}</td>
                      <td className="px-3 py-2 text-right text-white">{result.points ?? "-"}</td>
                      <td className="px-3 py-2 text-right text-white">{result.doplnovacek ?? "-"}</td>
                      <td className="px-3 py-2 text-white/78">{result.pub ?? "-"}</td>
                      <td className="px-3 py-2 text-white/58">{result.note ?? "-"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(result)}
                          className="h-8 rounded-md border border-white/24 px-3 text-xs font-semibold text-white/72 hover:bg-white/10"
                        >
                          Upravit
                        </button>{" "}
                        <button
                          type="button"
                          onClick={() => handleReject(result.id, result.teamName)}
                          disabled={rejectingId === result.id}
                          className="h-8 rounded-md border border-red-300/24 px-3 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-70"
                        >
                          {rejectingId === result.id ? "Mažu..." : "Vymazat"}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default ManualResultsPanel
