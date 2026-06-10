import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  parseCurrentHighlightsFromContent,
  parseTimelineFromContent,
  parseTimelineEvents
} from "./landing-parser";

export type { TimelineEvent } from "./landing-parser";
export { parseTimelineEvents };

const landingPath = path.join(process.cwd(), "contents/pages/landing.md");
const defaultProductionContentSiteUrl = "https://slavicalliance.cz";

export type LandingContentSource = "remote" | "local" | "empty";

export interface LandingPage {
  title: string;
  content: string;
  source: LandingContentSource;
}

export interface LandingData {
  page: LandingPage;
  timelineEvents: ReturnType<typeof parseTimelineFromContent>;
  currentHighlights: ReturnType<typeof parseCurrentHighlightsFromContent>;
  source: LandingContentSource;
}

const getContentSiteUrl = () => {
  const configured = process.env.CONTENT_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    return defaultProductionContentSiteUrl;
  }

  return "";
};

const readLandingRaw = async (): Promise<{ title: string; content: string; source: LandingContentSource }> => {
  const siteUrl = getContentSiteUrl();

  if (siteUrl) {
    try {
      const response = await fetch(`${siteUrl}/api/content/pages/landing`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { title?: string; raw?: string };
        if (payload.raw) {
          const fm = payload.raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
          const content = fm ? payload.raw.slice(fm[0].length) : payload.raw;
          return { title: payload.title || "Historie a úspěchy Slavic Alliance", content, source: "remote" };
        }
      }
    } catch {
      // fall through to local file
    }
  }

  if (!fs.existsSync(landingPath)) {
    return { title: "Historie a úspěchy Slavic Alliance", content: "", source: "empty" };
  }
  const fileContents = fs.readFileSync(landingPath, "utf8");
  const { data, content } = matter(fileContents);
  return { title: data.title || "Historie a úspěchy Slavic Alliance", content, source: "local" };
};

export const getLandingPage = async (): Promise<LandingPage> => {
  const { title, content, source } = await readLandingRaw();
  const introOnly = content.replace(/\n##[\s\S]*$/, "").trim();
  return { title, content: introOnly, source };
};

export const getTimelineEvents = async (): Promise<ReturnType<typeof parseTimelineFromContent>> => {
  const { content } = await readLandingRaw();
  return parseTimelineFromContent(content);
};

export const getLandingData = async (): Promise<LandingData> => {
  const { title, content, source } = await readLandingRaw();
  const introOnly = content.replace(/\n##[\s\S]*$/, "").trim();

  return {
    page: { title, content: introOnly, source },
    timelineEvents: parseTimelineFromContent(content),
    currentHighlights: parseCurrentHighlightsFromContent(content),
    source
  };
};
