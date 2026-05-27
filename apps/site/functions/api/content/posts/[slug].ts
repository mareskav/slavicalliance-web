import { Env, fallbackHello, json, postFromMarkdown, postKey } from "../../../_shared/content";

interface PagesContext {
  env: Env;
  params: { slug: string };
}

export const onRequestGet = async ({ env, params }: PagesContext) => {
  const slug = params.slug;
  const object = await env.CONTENT_BUCKET.get(postKey(slug));
  const raw = object ? await object.text() : slug === "hello" ? fallbackHello : null;

  if (!raw) {
    return json({ error: "Post not found." }, { status: 404 });
  }

  return json(postFromMarkdown(slug, raw));
};
