import { Env, fallbackHello, json, postFromMarkdown, slugFromKey } from "../../../_shared/content";

interface PagesContext {
  env: Env;
}

export const onRequestGet = async ({ env }: PagesContext) => {
  const listed = await env.CONTENT_BUCKET.list({ prefix: "contents/posts/" });
  const posts = await Promise.all(
    listed.objects
      .filter((object) => object.key.endsWith(".md"))
      .map(async (object) => {
        const slug = slugFromKey(object.key);
        const raw = await (await env.CONTENT_BUCKET.get(object.key))?.text();
        return raw ? postFromMarkdown(slug, raw) : null;
      }),
  );

  const filtered = posts.filter(Boolean);
  const result = filtered.length > 0 ? filtered : [postFromMarkdown("hello", fallbackHello)];

  return json(result.sort((a, b) => new Date(b!.date).getTime() - new Date(a!.date).getTime()));
};
