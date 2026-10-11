"use client"

import { useEffect, useState } from "react"

import { areResultsFresh } from "@/lib/results-freshness"

// Public R2 custom domain serving the JSON snapshots written by
// scripts/publish-results-snapshots.mjs.
export const resultsDataBaseUrl = (
  process.env.NEXT_PUBLIC_RESULTS_DATA_URL?.trim() || "https://data.slavicalliance.cz"
).replace(/\/$/, "")

const snapshotCache = new Map<string, Promise<unknown>>()

const fetchSnapshot = <T>(path: string): Promise<T> => {
  // Right after an admin save, bypass every cache so the new result shows at once.
  const fresh = areResultsFresh()
  const cached = fresh ? undefined : snapshotCache.get(path)

  if (cached) {
    return cached as Promise<T>
  }

  const url = fresh ? `${resultsDataBaseUrl}/${path}?t=${Date.now()}` : `${resultsDataBaseUrl}/${path}`
  const request = fetch(url, fresh ? { cache: "no-store" } : undefined).then((response) => {
    if (!response.ok) {
      throw new Error(`Snapshot ${path} failed with HTTP ${response.status}`)
    }

    return response.json() as Promise<T>
  })

  // Don't keep failures: the next navigation should retry.
  request.catch(() => snapshotCache.delete(path))
  snapshotCache.set(path, request)

  return request
}

type SnapshotState<T> = { path: string | null; data?: T; failed: boolean }

export const useSnapshot = <T,>(path: string | null) => {
  const [state, setState] = useState<SnapshotState<T>>({ path: null, failed: false })

  useEffect(() => {
    if (path === null) {
      return
    }

    let cancelled = false

    fetchSnapshot<T>(path).then(
      (data) => {
        if (!cancelled) setState({ path, data, failed: false })
      },
      (error) => {
        console.error(error)
        if (!cancelled) setState({ path, failed: true })
      }
    )

    return () => {
      cancelled = true
    }
  }, [path])

  // A stale state from a previous path counts as still loading.
  const current = state.path === path
  return {
    data: current ? state.data : undefined,
    failed: current && state.failed,
    loading: path !== null && !(current && (state.data !== undefined || state.failed))
  }
}
