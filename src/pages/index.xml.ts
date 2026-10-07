import type { APIRoute } from "astro";
import { getPublications } from "../lib/content";
import { rss } from "../lib/feeds";
import { site } from "../lib/site";
export const GET: APIRoute = async () => new Response(rss(await getPublications(), site.title, "/"), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
