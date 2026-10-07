import type { APIRoute } from "astro";
import { getPublications, getTags } from "../lib/content";
import { sitemap } from "../lib/feeds";
export const GET: APIRoute = async () => {
  const posts = await getPublications();
  const tags = await getTags();
  const urls = [
    { url: "/", date: posts[0]?.date },
    ...posts.map((post) => ({ url: post.url, date: post.date })),
    { url: "/publications/", date: posts[0]?.date },
    { url: "/tags/", date: posts[0]?.date },
    ...tags.map((tag) => ({ url: `/tags/${tag.slug}/`, date: tag.posts[0]?.date })),
    { url: "/archives/" }, { url: "/categories/" }, { url: "/search/" },
  ];
  return new Response(sitemap(urls), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
