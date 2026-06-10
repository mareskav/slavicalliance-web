export interface CurrentHighlightsSection {
  heading: string
  items: string[]
  endDate: string | null
}

export const celebratedHighlight = "3. Jarní liga Prahy 2026"

const normaliseCurrentHighlight = (value: string): string => value.trim().toLocaleLowerCase("cs-CZ")

const stripFrontmatter = (raw: string): string => {
  const frontmatterMatch = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return frontmatterMatch ? raw.slice(frontmatterMatch[0].length) : raw
}

const parseCurrentEndOfDay = (value: string | null): Date | null => {
  if (!value) return null

  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  return new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
}

export const parseCurrentHighlightsFromContent = (content: string): CurrentHighlightsSection => {
  const section: CurrentHighlightsSection = {
    heading: "Aktuálně",
    items: [],
    endDate: null
  }
  let isCurrentSection = false

  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith("##")) {
      const heading = line.replace(/^#+\s*/, "").trim()
      const normalisedHeading = heading.toLocaleLowerCase("cs-CZ")
      isCurrentSection = ["aktuální banner", "aktuální úspěch", "aktuální úspěchy", "aktuálně"].includes(
        normalisedHeading
      )
      if (isCurrentSection) section.heading = heading
      continue
    }

    if (!isCurrentSection) continue

    const match = line.match(/^[-*+]\s+(.+)$/)
    if (!match) continue

    const item = match[1].trim()
    const endDateMatch = item.match(/^Konec:\s*(.+)$/i)
    if (endDateMatch) {
      section.endDate = endDateMatch[1].trim()
      continue
    }

    section.items.push(item)
  }

  return section
}

export const parseCurrentHighlights = (raw: string): CurrentHighlightsSection => {
  return parseCurrentHighlightsFromContent(stripFrontmatter(raw))
}

export const getActiveCelebratedHighlight = (
  section: CurrentHighlightsSection,
  now: Date = new Date()
): string | null => {
  const label = section.items.find(
    (item) => normaliseCurrentHighlight(item) === normaliseCurrentHighlight(celebratedHighlight)
  )

  if (!label) return null

  const endDate = parseCurrentEndOfDay(section.endDate)
  return endDate && now.getTime() > endDate.getTime() ? null : label
}

export const shouldShowCelebratedHighlight = (
  section: CurrentHighlightsSection,
  now: Date = new Date()
): boolean => getActiveCelebratedHighlight(section, now) !== null
