import fs from "fs";
import path from "path";
import matter from "gray-matter";

const landingPath = path.join(process.cwd(), "contents/pages/landing.md");

export interface LandingPage {
  title: string;
  content: string;
}

export interface TimelineEvent {
  year: string;
  displayYear: string;
  highlights: string[];
}

const readLandingRaw = (): { title: string; content: string } => {
  if (!fs.existsSync(landingPath)) {
    return { title: "Historie a úspěchy Slavic Alliance", content: "" };
  }
  const fileContents = fs.readFileSync(landingPath, "utf8");
  const { data, content } = matter(fileContents);
  return { title: data.title || "Historie a úspěchy Slavic Alliance", content };
};

export const getLandingPage = (): LandingPage => {
  const { title, content } = readLandingRaw();
  // Strip everything from the first ## header so achievements don't appear in the story text
  const introOnly = content.replace(/\n##[\s\S]*$/, "").trim();
  return { title, content: introOnly };
};

// Accepts: 2024/25, 2024-25, 2024/2025 → normalised to "2024/25"
// Falls back to plain year: 2025 → "2025"
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

export const getTimelineEvents = (): TimelineEvent[] => {
  const { content } = readLandingRaw();
  const byYear = new Map<string, string[]>();
  const noYearItems: string[] = [];
  let currentSectionYear: string | null = null;

  for (const line of content.split(/\r?\n/)) {
    // Track active section year from ## headings (e.g. "## 2024/25", "## 🚀 Sezóna 2026")
    if (line.startsWith("##")) {
      currentSectionYear = extractYearKey(line);
      continue;
    }

    // Accepts -, * and + as bullet markers
    const match = line.match(/^[-*+]\s+(.+)$/);
    if (!match) continue;

    const item = match[1].trim();
    // Year from item text takes priority; fall back to current section year
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

  // Merge entries that share the same displayYear (e.g. "2024/25" + "2025" → "2025")
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
