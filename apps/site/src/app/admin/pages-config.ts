export type PageConfig = { slug: string; label: string; file: string }

export const PAGES: PageConfig[] = [
  { slug: "landing", label: "Domovská stránka", file: "contents/pages/landing.md" },
  { slug: "napsali-o-nas", label: "Napsali o nás", file: "contents/pages/napsali-o-nas.md" },
]

export const MANUAL_RESULTS_SLUG = "manual-results"

export type TabConfig = { slug: string; label: string }

export const ADMIN_TABS: TabConfig[] = [
  ...PAGES.map(({ slug, label }) => ({ slug, label })),
  { slug: MANUAL_RESULTS_SLUG, label: "Historické výsledky" },
]
