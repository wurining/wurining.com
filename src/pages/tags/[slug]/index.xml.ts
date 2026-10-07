import type { APIRoute } from "astro";
import { getTags } from "../../../lib/content";
import { rss } from "../../../lib/feeds";
export async function getStaticPaths() { return (await getTags()).map((tag) => ({ params: { slug: tag.slug }, props: { tag } })); }
export const GET: APIRoute = async ({ props }) => new Response(rss(props.tag.posts, props.tag.name, `/tags/${props.tag.slug}/`), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
