import { Env, fallbackLanding, json, pageFromMarkdown, pageKey } from "../../../_shared/content";

interface PagesContext {
  env: Env;
  params: { slug: string };
}

export const onRequestGet = async ({ env, params }: PagesContext) => {
  const slug = params.slug;
  const object = await env.CONTENT_BUCKET.get(pageKey(slug));
  const raw = object ? await object.text() : slug === "landing" ? fallbackLanding : null;

  if (!raw) {
    return json({ error: "Page not found." }, { status: 404 });
  }

  return json(pageFromMarkdown(slug, raw));
};
