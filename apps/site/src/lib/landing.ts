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
  const introOnly = content.replace(/\n##[\s\S]*$/, "").trim();
  return { title, content: introOnly };
};

export const getTimelineEvents = () => {
  const { content } = readLandingRaw();
  return parseTimelineFromContent(content);
};
