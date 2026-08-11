// Collects linkbox metadata for a url. Sources, first non-empty value per
// field wins: Peekalink (if key) -> Microlink -> page <meta> tags. A site
// box (link-sites.js) may add a source of its own and outranks them all.

import { envKey, get } from './shared.js';
import { siteFor } from './link-sites.js';

export const FIELDS = ['author', 'date', 'title', 'description', 'image'];

// Strips tags (also ones that entity-decoding uncovers), decodes entities,
// collapses whitespace to one line.
function clean(text) {
  if (!text) return undefined;
  return String(text)
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || undefined;
}

function isoDate(value) {
  const time = typeof value === 'number' ? value : Date.parse(value ?? '');
  return Number.isNaN(time) ? undefined : new Date(time).toISOString().slice(0, 10);
}

// Drops tracking params, then whatever the site itself wants dropped.
function canonical(url) {
  const parsed = new URL(url);
  for (const name of [...parsed.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|igsh)/.test(name)) parsed.searchParams.delete(name);
  }
  siteFor(url)?.canonical?.(parsed);
  if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/$/, '');
  return parsed.toString();
}

async function fromPeekalink(url, key) {
  const response = await get('https://api.peekalink.io/', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ link: url }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.message ?? `returned ${response.status}`);
  }
  // Author and date only exist on platform detail objects (instagramPost, ...).
  const details = Object.values(data).filter((value) => value && typeof value === 'object');
  const post = details.find((detail) => detail.publishedAt || detail.createdAt);
  const user = details.map((detail) => detail.user ?? detail.channel).find(Boolean);
  const image = data.image ?? {};
  return {
    url: data.url,
    title: data.title,
    description: data.description,
    author: user?.name || user?.username,
    date: isoDate(post?.publishedAt ?? post?.createdAt),
    image: (image.original ?? image.large ?? image.medium ?? image.thumbnail)?.url,
  };
}

async function fromMicrolink(url, key) {
  const endpoint = key ? 'https://pro.microlink.io/' : 'https://api.microlink.io/';
  const response = await get(`${endpoint}?url=${encodeURIComponent(url)}`, {
    headers: key ? { 'x-api-key': key } : {},
  });
  const body = await response.json().catch(() => ({}));
  if (body.status !== 'success') throw new Error(body.message ?? `returned ${response.status}`);
  return {
    url: body.data.url,
    title: body.data.title,
    description: body.data.description,
    author: body.data.author,
    // No date: Microlink falls back to scrape time when the page names none.
    image: body.data.image?.url,
  };
}

async function fromMeta(url) {
  const response = await get(url);
  if (!response.ok) throw new Error(`returned ${response.status}`);
  const html = await response.text();

  const meta = (...names) => {
    for (const name of names) {
      const tag = html.match(
        new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i')
      )?.[0];
      const content = tag?.match(/content=(?:"([^"]*)"|'([^']*)')/i);
      if (content?.[1] || content?.[2]) return content[1] ?? content[2];
    }
    return undefined;
  };

  // First JSON-LD object (including @graph members) naming an author or date.
  let ld = {};
  for (const [, json] of html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const nodes = [JSON.parse(json)].flat().flatMap((node) => [node, ...[node['@graph'] ?? []].flat()]);
      ld = nodes.find((node) => node?.datePublished || node?.author) ?? {};
      if (ld.datePublished || ld.author) break;
    } catch {
      /* skip malformed blocks */
    }
  }
  const ldAuthor = [ld.author].flat()[0];

  const found = {
    url: response.url,
    siteName: meta('og:site_name'),
    title: meta('og:title', 'twitter:title') ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    description: meta('og:description', 'twitter:description', 'description'),
    author:
      meta('author', 'article:author') ?? (typeof ldAuthor === 'object' ? ldAuthor?.name : ldAuthor),
    date: isoDate(meta('article:published_time', 'datePublished', 'date') ?? ld.datePublished),
    image: meta('og:image', 'og:image:url', 'twitter:image'),
  };

  // Resolved after the redirect: a shortened link lands on the real site.
  const site = siteFor(response.url);
  return site?.fromPage ? { ...found, ...site.fromPage(html, found) } : found;
}

export async function collect(url) {
  const site = siteFor(url);
  const peekalinkKey = envKey('PEEKALINK_API_KEY');
  const apis = [
    peekalinkKey && ['Peekalink', () => fromPeekalink(url, peekalinkKey), false],
    ['Microlink', () => fromMicrolink(url, envKey('MICROLINK_API_KEY')), false],
  ].filter(Boolean);
  const page = ['page metadata', () => fromMeta(url), true];
  const own = site?.source && [site.source.name, () => site.source.read(url), true];
  // What a site knows about itself outranks what the preview APIs guess.
  const sources = site ? [page, own, ...apis].filter(Boolean) : [...apis, page];

  const info = { url };
  let siteName;
  for (const [name, source, firstParty] of sources) {
    if (FIELDS.every((field) => info[field])) break;
    try {
      const found = await source();
      for (const field of FIELDS) {
        if (!firstParty && site?.firstParty?.includes(field)) continue;
        info[field] ||= field === 'image' ? found.image : clean(found[field]);
      }
      if (found.url) info.url = found.url;
      siteName ||= clean(found.siteName);
    } catch (error) {
      console.warn(`${name}: ${error.message}`);
    }
  }
  info.url = canonical(info.url);

  // Trim a "<title> - <site name>" suffix the way the hand-made entries do.
  if (info.title && siteName) {
    const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const trimmed = info.title.replace(new RegExp(`\\s*[-–—|·:]\\s*${escaped}$`, 'i'), '');
    if (trimmed) info.title = trimmed;
  }
  return info;
}
