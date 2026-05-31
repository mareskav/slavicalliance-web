import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { parseTimelineFromContent, parseTimelineEvents } from "./landing-parser";

export type { TimelineEvent } from "./landing-parser";
export { parseTimelineEvents };

const landingPath = path.join(process.cwd(), "contents/pages/landing.md");

export interface LandingPage {
  title: string;
  content: string;
}

const readLandingRaw = async (): Promise<{ title: string; content: string }> => {
  const siteUrl = process.env.CONTENT_SITE_URL?.trim();

  if (siteUrl) {
    try {
      const response = await fetch(`${siteUrl}/api/content/pages/landing`);
      if (response.ok) {
        const payload = (await response.json()) as { title?: string; raw?: string };
        if (payload.raw) {
          const fm = payload.raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
          const content = fm ? payload.raw.slice(fm[0].length) : payload.raw;
          return { title: payload.title || "Historie a úspěchy Slavic Alliance", content };
        }
      }
    } catch {
      // fall through to local file
    }
  }

  if (!fs.existsSync(landingPath)) {
    return { title: "Historie a úspěchy Slavic Alliance", content: "" };
  }
  const fileContents = fs.readFileSync(landingPath, "utf8");
  const { data, content } = matter(fileContents);
  return { title: data.title || "Historie a úspěchy Slavic Alliance", content };
};

export const getLandingPage = async (): Promise<LandingPage> => {
  const { title, content } = await readLandingRaw();
  const introOnly = content.replace(/\n##[\s\S]*$/, "").trim();
  return { title, content: introOnly };
};

export const getTimelineEvents = async (): Promise<ReturnType<typeof parseTimelineFromContent>> => {
  const { content } = await readLandingRaw();
  return parseTimelineFromContent(content);
};
