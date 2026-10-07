import type { APIRoute } from "astro";
import { getPublications } from "../../lib/content";
import { rss } from "../../lib/feeds";
export const GET: APIRoute = async () => new Response(rss(await getPublications(), "Publications", "/publications/"), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
