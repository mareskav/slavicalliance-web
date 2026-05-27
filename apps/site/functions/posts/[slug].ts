interface PagesContext {
  env: { ASSETS: { fetch(request: Request): Promise<Response> } };
  request: Request;
}

export const onRequestGet = async ({ env, request }: PagesContext) => {
  const url = new URL(request.url);
  url.pathname = "/post";
  url.search = "";

  return env.ASSETS.fetch(new Request(url.toString(), request));
};
