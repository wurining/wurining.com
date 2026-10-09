import type MarkdownIt from 'markdown-it';
import { site } from './site';

type MarkdownRenderer = InstanceType<typeof MarkdownIt>;
const siteHostname = new URL(site.url).hostname.replace(/^www\./, '');

export function isExternalUrl(href: string): boolean {
  const value = href.trim().replace(/[\t\n\r]/g, '');
  if (!/^(?:https?:|\/\/)/i.test(value)) return false;
  try {
    const url = new URL(value, site.url);
    return /^https?:$/.test(url.protocol) && url.hostname.replace(/^www\./, '') !== siteHostname;
  } catch {
    return false;
  }
}

export function externalLinkAttributes(href: string, rel?: string): { target?: '_blank'; rel?: string } {
  if (!isExternalUrl(href)) return rel ? { rel } : {};
  const tokens = rel?.split(/\s+/).filter(Boolean) ?? [];
  for (const required of ['noopener', 'noreferrer']) {
    if (!tokens.some((token) => token.toLowerCase() === required)) tokens.push(required);
  }
  return { target: '_blank', rel: tokens.join(' ') };
}

// Match complete attributes so quoted values and unrelated attributes stay intact.
const attributePattern = /\s+([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function externalHtmlLinks(html: string, markdown: MarkdownRenderer): string {
  // Raw HTML bypasses link_open. Skip comments and raw-text elements while rewriting anchors.
  const tags = /<!--[\s\S]*?-->|<(script|style|textarea)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<\/?[a-z][\w:-]*(?=\s|\/?>)(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
  return html.replace(tags, (tag: string) => {
    if (!/^<a(?=\s|\/?>)/i.test(tag)) return tag;
    const attributes = [...tag.matchAll(attributePattern)];
    const value = (name: string) => {
      const match = attributes.find((attribute) => attribute[1].toLowerCase() === name);
      return match ? markdown.utils.unescapeAll(match[2] ?? match[3] ?? match[4] ?? '') : '';
    };
    const href = value('href');
    if (!isExternalUrl(href)) return tag;
    const { rel } = externalLinkAttributes(href, value('rel'));
    const unquotedSlash = attributes.some((attribute) => attribute[4]?.endsWith('/') && (attribute.index ?? 0) + attribute[0].length === tag.length - 1);
    const closing = tag.endsWith('/>') && !unquotedSlash ? '/>' : '>';
    const retained = tag.replace(attributePattern, (attribute, name: string) => /^(target|rel)$/i.test(name) ? '' : attribute);
    return `${retained.slice(0, -closing.length)} target="_blank" rel="${markdown.utils.escapeHtml(rel ?? '')}"${closing}`;
  });
}

export function externalLinkPlugin(markdown: MarkdownRenderer): void {
  const linkOpen = markdown.renderer.rules.link_open;
  markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const rel = token.attrGet('rel');
    const attributes = externalLinkAttributes(String(token.attrGet('href') ?? ''), rel === null ? undefined : String(rel));
    if (attributes.target) token.attrSet('target', attributes.target);
    if (attributes.rel) token.attrSet('rel', attributes.rel);
    return linkOpen ? linkOpen(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
  };
  for (const type of ['html_inline', 'html_block']) {
    const render = markdown.renderer.rules[type];
    markdown.renderer.rules[type] = (tokens, index, options, env, self) => {
      const html = render ? render(tokens, index, options, env, self) : tokens[index].content;
      return externalHtmlLinks(html, markdown);
    };
  }
}
