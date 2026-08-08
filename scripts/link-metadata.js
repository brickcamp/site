// Collects linkbox metadata for a url. Sources, first non-empty value per
// field wins: Peekalink (if key) -> Microlink -> Flickr oEmbed -> page
// <meta> tags.

import { envKey, get } from './shared.js';

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

const isFlickr = (url) => /(^|\.)flickr\.com$/.test(new URL(url).hostname);

// Drops tracking params and Flickr's /in/<context> suffix.
function canonical(url) {
  const parsed = new URL(url);
  for (const name of [...parsed.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|igsh)/.test(name)) parsed.searchParams.delete(name);
  }
  if (isFlickr(url)) parsed.pathname = parsed.pathname.replace(/\/in\/[^/]+\/?$/, '');
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

async function fromFlickrOembed(url) {
  const response = await get(
    `https://www.flickr.com/services/oembed?format=json&url=${encodeURIComponent(url)}`
  );
  if (!response.ok) throw new Error(`returned ${response.status}`);
  const data = await response.json();
  return {
    title: data.title,
    author: data.author_name,
    image: data.type === 'photo' ? data.url : data.thumbnail_url,
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

  // Flickr photo pages embed the upload date and owner name in page JSON.
  const flickr = isFlickr(response.url);
  const posted = flickr && html.match(/"datePosted":"?(\d{9,10})/)?.[1];
  const owner = flickr && html.match(/"realname":"((?:[^"\\]|\\.)*)"/)?.[1];

  // Description-less Flickr photos carry an "Explore ..." placeholder.
  let description = meta('og:description', 'twitter:description', 'description');
  if (flickr && /^Explore .* photos on Flickr!$/.test(description ?? '')) description = undefined;

  return {
    url: response.url,
    siteName: meta('og:site_name'),
    title: meta('og:title', 'twitter:title') ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    description,
    author:
      (owner && JSON.parse(`"${owner}"`)) ||
      (meta('author', 'article:author') ?? (typeof ldAuthor === 'object' ? ldAuthor?.name : ldAuthor)),
    date: posted
      ? isoDate(Number(posted) * 1000)
      : isoDate(meta('article:published_time', 'datePublished', 'date') ?? ld.datePublished),
    image: meta('og:image', 'og:image:url', 'twitter:image'),
  };
}

export async function collect(url) {
  const peekalinkKey = envKey('PEEKALINK_API_KEY');
  const sources = [
    ['Peekalink', () => fromPeekalink(url, peekalinkKey), Boolean(peekalinkKey)],
    ['Microlink', () => fromMicrolink(url, envKey('MICROLINK_API_KEY')), true],
    ['Flickr oEmbed', () => fromFlickrOembed(url), isFlickr(url)],
    ['page metadata', () => fromMeta(url), true],
  ];
  // Flickr's raw page and oEmbed are ground truth (realname, datePosted, real
  // og tags); the preview APIs fabricate dates and descriptions there.
  if (isFlickr(url)) sources.unshift(...sources.splice(2, 2).reverse());

  const info = { url };
  let siteName;
  for (const [name, source, enabled] of sources) {
    if (!enabled) continue;
    if (FIELDS.every((field) => info[field])) break;
    try {
      const found = await source();
      if (isFlickr(url) && name !== 'Flickr oEmbed' && name !== 'page metadata') {
        delete found.description;
        delete found.date;
      }
      for (const field of FIELDS) {
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
