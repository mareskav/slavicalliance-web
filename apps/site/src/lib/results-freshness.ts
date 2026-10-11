// After an admin saves a manual result, that browser reads the results snapshots
// uncached for a while, so the result shows up right away instead of after the
// 60 s public cache (browser and Cloudflare edge).
const storageKey = "sa-results-fresh-until"
const freshWindowMs = 5 * 60 * 1000

export const markResultsFresh = () => {
  try {
    window.localStorage.setItem(storageKey, String(Date.now() + freshWindowMs))
  } catch {
    // Storage may be blocked; the snapshot just follows the normal cache then.
  }
}

export const areResultsFresh = () => {
  try {
    return Number(window.localStorage.getItem(storageKey)) > Date.now()
  } catch {
    return false
  }
}
