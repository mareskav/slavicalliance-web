import { Env } from "../../_shared/content";

interface PagesContext {
  env: Env;
  params: { path: string[] };
}

export const onRequestGet = async ({ env, params }: PagesContext) => {
  const key = `uploads/${params.path.join("/")}`;
  const object = await env.CONTENT_BUCKET.get(key);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(await object.arrayBuffer(), {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": object.httpMetadata?.contentType || "application/octet-stream",
    },
  });
};
