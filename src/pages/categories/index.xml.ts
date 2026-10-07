import type { APIRoute } from "astro";
import { rss } from "../../lib/feeds";
export const GET: APIRoute = () => new Response(rss([], "Categories", "/categories/"), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
