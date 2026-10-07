import type { Post } from './content';
import { site } from './site';

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
}

export function rss(posts: Post[], title: string, path: string): string {
  const url = new URL(path, site.url).href;
  const feedUrl = new URL('index.xml', url).href;
  return `<?xml version="1.0" encoding="utf-8" standalone="yes"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeXml(title === site.title ? title : `${title} on ${site.title}`)}</title><link>${escapeXml(url)}</link><description>${escapeXml(`Recent content ${title === site.title ? '' : `in ${title} `}on ${site.title}`)}</description><generator>Astro</generator><language>${site.language}</language>${posts[0] ? `<lastBuildDate>${posts[0].date.toUTCString()}</lastBuildDate>` : ''}<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>${posts.map((post) => `<item><title>${escapeXml(post.title)}</title><link>${site.url}${post.url}</link><pubDate>${post.date.toUTCString()}</pubDate><guid>${site.url}${post.url}</guid><description>${escapeXml(post.description ?? post.summary)}</description></item>`).join('')}</channel></rss>`;
}

export function sitemap(urls: { url: string; date?: Date }[]): string {
  return `<?xml version="1.0" encoding="utf-8" standalone="yes"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(({ url, date }) => `<url><loc>${escapeXml(new URL(url, site.url).href)}</loc>${date ? `<lastmod>${date.toISOString().replace('.000Z', '+00:00')}</lastmod>` : ''}</url>`).join('')}</urlset>`;
}
