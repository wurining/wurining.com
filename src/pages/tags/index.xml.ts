import type { APIRoute } from "astro";
import { getTags } from "../../lib/content";
import { rss } from "../../lib/feeds";
export const GET: APIRoute = async () => {
  const terms = (await getTags()).map((tag) => ({ ...tag.posts[0], title: tag.name, url: `/tags/${tag.slug}/`, description: "", summary: "" }));
  return new Response(rss(terms, "Tags", "/tags/"), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
