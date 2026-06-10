import {
  getActiveCelebratedHighlight,
  parseCurrentHighlights,
  parseCurrentHighlightsFromContent,
  shouldShowCelebratedHighlight,
  type CurrentHighlightsSection
} from "@repo/ui/lib/celebration";

export {
  getActiveCelebratedHighlight,
  parseCurrentHighlights,
  parseCurrentHighlightsFromContent,
  shouldShowCelebratedHighlight
};
export type { CurrentHighlightsSection };

export interface TimelineEvent {
  year: string;
  displayYear: string;
  highlights: string[];
}

const stripFrontmatter = (raw: string): string => {
  const frontmatterMatch = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return frontmatterMatch ? raw.slice(frontmatterMatch[0].length) : raw;
};

const currentSectionHeadings = new Set(["aktuální banner", "aktuální úspěch", "aktuální úspěchy", "aktuálně"]);

const getCurrentSectionHeading = (text: string): string | null => {
  const heading = text.replace(/^#+\s*/, "").trim();
  return currentSectionHeadings.has(heading.toLocaleLowerCase("cs-CZ")) ? heading : null;
};

const isCurrentSectionHeading = (text: string): boolean => getCurrentSectionHeading(text) !== null;

const extractYearKey = (text: string): string | null => {
  const seasonMatch = text.match(/\b(20\d{2})[\/\-](?:20)?(\d{2})\b/);
  if (seasonMatch) return `${seasonMatch[1]}/${seasonMatch[2].slice(-2)}`;
  const yearMatch = text.match(/\b(20\d{2})\b/);
  return yearMatch ? yearMatch[1] : null;
};

const yearSortValue = (year: string): number => {
  const m = year.match(/^(20\d{2})\/\d{2}$/);
  return m ? parseInt(m[1]) + 0.5 : parseInt(year);
};

const toDisplayYear = (year: string): string => {
  const m = year.match(/^(20\d{2})\/(\d{2})$/);
  return m ? `20${m[2]}` : year;
};

const highlightPriority = (item: string): number => {
  if (item.includes("🥇")) return 0;
  if (item.includes("🥈")) return 1;
  if (item.includes("🥉")) return 2;
  if (/^\d+\./.test(item.trimStart())) return 3;
  return 4;
};

export const parseTimelineFromContent = (content: string): TimelineEvent[] => {
  const byYear = new Map<string, string[]>();
  const noYearItems: string[] = [];
  let currentSectionYear: string | null = null;
  let isCurrentSection = false;

  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith("##")) {
      isCurrentSection = isCurrentSectionHeading(line);
      currentSectionYear = isCurrentSection ? null : extractYearKey(line);
      continue;
    }

    if (isCurrentSection) continue;

    const match = line.match(/^[-*+]\s+(.+)$/);
    if (!match) continue;

    const item = match[1].trim();
    const year = extractYearKey(item) ?? currentSectionYear;

    if (!year) {
      noYearItems.push(item);
      continue;
    }

    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(item);
  }

  if (noYearItems.length > 0) {
    console.warn(
      `[TeamTimeline] ${noYearItems.length} položka/položek v landing.md neobsahuje rok` +
        ` a nebude zobrazena v timeline:\n` +
        noYearItems.map((i) => `  - ${i}`).join("\n")
    );
  }

  const byDisplayYear = new Map<string, { year: string; highlights: string[] }>();

  for (const [year, highlights] of [...byYear.entries()].sort(([a], [b]) => yearSortValue(a) - yearSortValue(b))) {
    const display = toDisplayYear(year);
    if (!byDisplayYear.has(display)) {
      byDisplayYear.set(display, { year, highlights: [] });
    }
    byDisplayYear.get(display)!.highlights.push(...highlights);
  }

  return [...byDisplayYear.entries()].map(([displayYear, { year, highlights }]) => ({
    year,
    displayYear,
    highlights: [...highlights].sort((a, b) => highlightPriority(a) - highlightPriority(b)),
  }));
};

export const parseTimelineEvents = (raw: string): TimelineEvent[] => {
  return parseTimelineFromContent(stripFrontmatter(raw));
};
