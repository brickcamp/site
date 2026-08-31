// Part groups: the browsing buckets the part list opens on. A group is a page
// under content/partgroups/, seeded from a Rebrickable part category; a part
// joins one by naming it in its `partgroups` front matter.
//
// Assignment is write-once. A part that already names a group is never
// re-tagged, so a recategorization upstream cannot silently move a part —
// or undo a hand correction.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { envKey, get, root, tomlQuote } from './shared.js';

export const groupsDir = path.join(root, 'content', 'partgroups');

// Rebrickable sometimes combines categories, like 'Bars, Ladders and Fences'.
// Drop "and", ",", ... to keep slugs short
export function groupSlug(name) {
  return name
    .toLowerCase()
    .replace(/\band\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Use partnum from Rebrickable URL against API, as it might differ from our internal slug
export function partNumberOf(frontMatter) {
  return /rebrickable\.com\/parts\/([^/]+)\//.exec(frontMatter)?.[1];
}

export const groupOf = (frontMatter) => /^partgroups\s*=\s*\[\s*'([^']*)'/m.exec(frontMatter)?.[1];

export async function apiKey() {
  const key = envKey('REBRICKABLE_API_KEY');
  if (!key) throw new Error('REBRICKABLE_API_KEY not set; copy .env.example to .env and fill it in');
  return key;
}

let categories;
export async function lookupCategories() {
  if (categories) return categories;

  const response = await get(
    `https://rebrickable.com/api/v3/lego/part_categories/?page_size=1000&key=${await apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Rebrickable API returned ${response.status} for the part categories`);
  }
  categories = new Map((await response.json()).results.map((c) => [c.id, c.name]));
  return categories;
}

// Returns the group a category belongs in, creating its page when missing. 
// Several groups may name the same category after it has been split by hand.
// Then the caller has to choose, so say so rather than guess.
export async function groupForCategory(id, { write = true } = {}) {
  const name = (await lookupCategories()).get(id);
  if (!name) throw new Error(`Rebrickable category ${id} is unknown`);

  const claiming = await groupsClaiming(id);
  if (claiming.length === 1) return claiming[0];
  if (claiming.length > 1) {
    throw new Error(`category ${id} (${name}) is split across ${claiming.join(', ')} — tag by hand`);
  }

  const slug = groupSlug(name);
  if (write) {
    await mkdir(path.join(groupsDir, slug), { recursive: true });
    await writeFile(
      path.join(groupsDir, slug, '_index.md'),
      `+++\ntitle = ${tomlQuote(name)}\n\n[params]\nrebrickablePartCategory = ${id}\n+++\n`
    );
    console.log(`created content/partgroups/${slug} (${name})`);
  }
  return slug;
}

async function groupsClaiming(id) {
  if (!existsSync(groupsDir)) return [];

  const { readdir } = await import('node:fs/promises');
  const found = [];
  for (const slug of await readdir(groupsDir)) {
    const file = path.join(groupsDir, slug, '_index.md');
    if (!existsSync(file)) continue;
    if (new RegExp(`^rebrickablePartCategory\\s*=\\s*${id}\\s*$`, 'm').test(await readFile(file, 'utf8'))) {
      found.push(slug);
    }
  }
  return found.sort();
}

// Writes `partgroups` into a part's front matter, above the [params] table,
// and re-pads the keys around it so the '=' stay in one column.
export function withGroup(frontMatter, slug) {
  const tagged = frontMatter.replace(
    /\n\n\[params\]/,
    `\npartgroups = [${tomlQuote(slug)}]\n\n[params]`
  );
  return tagged.replace(/^(title|aliases)(\s*)=/gm, (_, key) => `${key.padEnd(10)} =`);
}
