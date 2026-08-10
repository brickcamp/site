// The entry folder layout — content/entries/<bucket>/<id>/index.md, a
// sequential 4-digit ID bucketed by the hundred — and entry creation via
// hugo new from archetypes/entries.md.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { gitAuthor, stubModel } from './model.js';
import { root } from './shared.js';

// Trailing-x width of each bucket level above an entry, top to leaf.
// Twin constant: $layers in layouts/_partials/entries/validateIds.html.
const LAYERS = [2];
const WIDTH = 4;

export const isSlug = (text) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(text);
export const isEntryId = (text) => new RegExp(`^\\d{1,${WIDTH}}$`).test(text);

export function entryFile(id) {
  const padded = String(id).padStart(WIDTH, '0');
  const buckets = LAYERS.map((mask) => padded.slice(0, WIDTH - mask) + 'x'.repeat(mask));
  const relative = path.join('content', 'entries', ...buckets, padded, 'index.md');
  const file = path.join(root, relative);
  return { id: padded, dir: path.dirname(file), file, relative };
}

export function entryIds() {
  return readdirSync(path.join(root, 'content', 'entries'), { recursive: true })
    .map((p) => path.basename(p))
    .filter((name) => new RegExp(`^\\d{${WIDTH}}$`).test(name))
    .map(Number)
    .sort((a, b) => a - b);
}

export const highestId = () => Math.max(...entryIds());

// The slug only fills the url (/entry/<slug>/) and a first-guess title;
// the folder follows from the next free ID alone. Returns the new ID.
export function createEntry(slug) {
  const id = highestId() + 1;
  const { dir, file, relative } = entryFile(id);
  // stdin stays ours: the caller is usually mid-question on the terminal.
  execFileSync('hugo', ['new', relative], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });

  const title = slug.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
  const text = readFileSync(file, 'utf8')
    .replace("title = 'Replace Me'", `title = '${title}'`)
    .replace("url     = '/entry/replace-me/'", `url     = '/entry/${slug}/'`)
    .replace(/\n+\{\{< linkbox[\s\S]*?\{\{< \/linkbox >\}\}\n*/, '\n');
  if (!text.includes(slug) || text.includes('{{< linkbox')) {
    throw new Error('archetype placeholders changed; update entry.js');
  }
  writeFileSync(file, text);
  writeFileSync(path.join(dir, 'model.ldr'), stubModel(id, title, gitAuthor()));

  console.log(`created ${relative} — entry #${id}, /entry/${slug}/`);
  return id;
}
