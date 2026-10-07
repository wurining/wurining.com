import type { APIRoute } from "astro";
import { site } from "../lib/site";
export const GET: APIRoute = () => new Response(`User-agent: *\nDisallow:\nSitemap: ${new URL("sitemap.xml", site.url).href}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
