import fs from "fs";
import path from "path";
import matter from "gray-matter";

const landingPath = path.join(process.cwd(), "contents/pages/landing.md");

export interface LandingPage {
  title: string;
  content: string;
}

export function getLandingPage(): LandingPage {
  if (!fs.existsSync(landingPath)) {
    return {
      title: "Historie a úspěchy Slavic Alliance",
      content: "",
    };
  }

  const fileContents = fs.readFileSync(landingPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    title: data.title || "Historie a úspěchy Slavic Alliance",
    content,
  };
}
