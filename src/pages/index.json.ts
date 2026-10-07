import type { APIRoute } from "astro";
import { getPublications } from "../lib/content";
import { site } from "../lib/site";
export const GET: APIRoute = async () => new Response(JSON.stringify((await getPublications()).map((post) => ({
  content: post.plainText, permalink: new URL(post.url, site.url).href, summary: post.summary, title: post.title,
}))), { headers: { "Content-Type": "application/json; charset=utf-8" } });
