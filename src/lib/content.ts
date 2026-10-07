import { parse } from 'yaml';
import MarkdownIt from 'markdown-it';

export interface Post {
  slug: string;
  url: string;
  title: string;
  description?: string;
  summary: string;
  html: string;
  plainText: string;
  date: Date;
  authors: string[];
  readingTime: number;
  wordCount: number;
  tags: string[];
  draft: boolean;
  showToc: boolean;
  tocHtml?: string;
  disableShare?: boolean;
  assets: string[];
  cover?: {
    image: string;
    alt: string;
    captionHtml?: string;
    hiddenInList?: boolean;
    hiddenInSingle?: boolean;
  };
}

export type Publication = Post;

const sourceFiles = import.meta.glob('../content/**/*.md', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;
const markdown = new MarkdownIt({ html: true, linkify: true });

function frontmatter(raw: string): { data: Record<string, any>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('Markdown content must begin with YAML frontmatter.');
  return { data: parse(match[1]), content: raw.slice(match[0].length) };
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function tagSlug(name: string): string {
  return name.toLowerCase().normalize('NFC').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '').replace(/-+/g, '-');
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function plainText(html: string): string {
  return html.replace(/<a hidden class="anchor"[^>]*>#[\s]*<\/a>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

function convertShortcodes(source: string, assetBase: string): { markdown: string; assets: string[] } {
  const assets: string[] = [];
  const processed = source.replace(/\{\{<\s*pre\s*>\}\}([\s\S]*?)\{\{<\s*\/pre\s*>\}\}/g,
    (_, algorithm: string) => `\n<pre class="pseudocode">${escapeHtml(algorithm)}</pre>\n`)
    .replace(/\{\{<\s*figure\s+([\s\S]*?)\s*>\}\}/g, (_, attrs: string) => {
      const values = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
      const src = values.src?.startsWith('/') || /^https?:/.test(values.src ?? '') ? values.src : `${assetBase}${values.src ?? ''}`;
      assets.push(src);
      return `\n<figure><img loading="lazy" src="${escapeHtml(src)}"${values.width ? ` width="${escapeHtml(values.width)}"` : ''}${values.height ? ` height="${escapeHtml(values.height)}"` : ''}${values.alt ? ` alt="${escapeHtml(values.alt)}"` : ''}>${values.title || values.caption ? `<figcaption>${values.title ? escapeHtml(values.title) : ''}${values.caption ? `<p>${escapeHtml(values.caption)}</p>` : ''}</figcaption>` : ''}</figure>\n`;
    });
  if (/\{\{[<%]/.test(processed)) throw new Error('Unsupported Hugo shortcode in content; migrate it explicitly before publishing.');
  return { markdown: processed, assets };
}

export async function getPublications(): Promise<Post[]> {
  const posts: Post[] = [];
  for (const [path, raw] of Object.entries(sourceFiles)) {
    if (!path.startsWith('../content/publications/')) continue;
    const { data, content } = frontmatter(raw);
    if (data.draft === true) continue;
    const date = new Date(data.date);
    if (Number.isNaN(date.getTime())) throw new Error(`Missing or invalid publication date: ${path}`);
    if (date.getTime() > Date.now() || (data.expiryDate && new Date(data.expiryDate).getTime() < Date.now())) continue;
    const relative = path.slice('../content/publications/'.length);
    const defaultSlug = relative.replace(/\/index\.md$/, '').replace(/\.md$/, '');
    const slug = data.slug || defaultSlug;
    const assetBase = `/publications/${relative.includes('/') ? `${slug}/` : ''}`;
    const converted = convertShortcodes(content, assetBase);
    const headings: { level: number; title: string; id: string }[] = [];
    const seen = new Map<string, number>();
    const renderer = new MarkdownIt({ html: true, linkify: true });
    renderer.renderer.rules.heading_open = (tokens, index, options, _env, self) => {
      const title = tokens[index + 1].content;
      const base = tagSlug(title);
      const occurrence = seen.get(base) ?? 0;
      seen.set(base, occurrence + 1);
      const id = occurrence ? `${base}-${occurrence}` : base;
      tokens[index].attrSet('id', id);
      headings.push({ level: Number(tokens[index].tag.slice(1)), title, id });
      return self.renderToken(tokens, index, options);
    };
    renderer.renderer.rules.heading_close = (tokens, index, options, _env, self) => {
      const id = headings.at(-1)?.id ?? '';
      return `<a hidden class="anchor" aria-hidden="true" href="#${escapeHtml(id)}">#</a>${self.renderToken(tokens, index, options)}`;
    };
    const html = renderer.render(converted.markdown);
    const text = plainText(html);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const cover = data.cover?.image ? {
      image: data.cover.relative ? `${assetBase}${data.cover.image}` : data.cover.image,
      alt: data.cover.alt ?? '',
      captionHtml: data.cover.caption ? markdown.renderInline(data.cover.caption) : undefined,
      hiddenInList: Boolean(data.cover.hidden || data.cover.hiddenInList),
      hiddenInSingle: Boolean(data.cover.hidden || data.cover.hiddenInSingle),
    } : undefined;
    posts.push({
      slug, url: `/publications/${slug}/`, title: data.title,
      description: data.description, summary: data.summary || text.slice(0, 280),
      html, plainText: text, date, authors: Array.isArray(data.author) ? data.author : [data.author].filter(Boolean),
      readingTime: Math.ceil(wordCount / 212), wordCount, tags: data.tags ?? [],
      draft: false, showToc: Boolean(data.ShowToc), disableShare: Boolean(data.disableShare),
      tocHtml: `<ul>${headings.filter(({ level }) => level > 1).map(({ title, id }) => `<li><a href="#${id}">${escapeHtml(title)}</a></li>`).join('')}</ul>`,
      assets: converted.assets, cover,
    });
  }
  return posts.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getTags(): Promise<{ name: string; slug: string; url: string; count: number; posts: Post[] }[]> {
  const groups = new Map<string, Post[]>();
  for (const post of await getPublications()) {
    for (const name of post.tags) groups.set(name, [...(groups.get(name) ?? []), post]);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([name, posts]) => ({ name, slug: tagSlug(name), url: `/tags/${tagSlug(name)}/`, count: posts.length, posts }));
}

export async function getContentPage(name: 'search' | 'archives'): Promise<{ title: string; description?: string; placeholder?: string } | undefined> {
  const raw = sourceFiles[`../content/${name}.md`];
  if (!raw) return undefined;
  const { data } = frontmatter(raw);
  return { title: data.title, description: data.description, placeholder: data.placeholder };
}
