// Sites whose pages the generic metadata sources get wrong — one box each.
// A box may declare:
//   hosts       domains it owns, subdomains included
//   canonical   URL cleanup beyond the tracking params
//   source      an extra adapter, tried before the preview APIs
//   fromPage    a patch over what the page scraper found
//   firstParty  fields the preview APIs may not fill
// fromPage keys and firstParty entries are link-metadata.js field names.

import { get } from './shared.js';

async function flickrOembed(url) {
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

const SITES = [
  {
    hosts: ['flickr.com'],
    canonical: (parsed) => {
      parsed.pathname = parsed.pathname.replace(/\/in\/[^/]+\/?$/, '');
    },
    source: { name: 'Flickr oEmbed', read: flickrOembed },
    // The upload date and the owner's real name live in the page JSON, and a
    // photo with no description carries an "Explore ..." placeholder.
    fromPage(html, found) {
      const posted = html.match(/"datePosted":"?(\d{9,10})/)?.[1];
      const owner = html.match(/"realname":"((?:[^"\\]|\\.)*)"/)?.[1];
      return {
        author: (owner && JSON.parse(`"${owner}"`)) || found.author,
        date: posted
          ? new Date(Number(posted) * 1000).toISOString().slice(0, 10)
          : found.date,
        description: /^Explore .* photos on Flickr!$/.test(found.description ?? '')
          ? undefined
          : found.description,
      };
    },
    // The preview APIs fabricate both on flickr.com.
    firstParty: ['date', 'description'],
  },
];

export function siteFor(url) {
  const host = new URL(url).hostname;
  return SITES.find((site) =>
    site.hosts.some((owned) => host === owned || host.endsWith(`.${owned}`))
  );
}
