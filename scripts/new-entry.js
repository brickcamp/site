#!/usr/bin/env node
// Creates the next entry: content/entries/<bucket>/<id>/index.md via hugo new.
//
// Usage: npm run new-entry -- <url-slug>
//
// The ID is the highest existing one plus 1, and the folder follows from the
// ID alone; the slug only fills the url (/entry/<slug>/) and a first-guess
// title in the scaffold from archetypes/entries.md.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Trailing-x width of each bucket level above an entry, top to leaf.
// Twin constant: $layers in layouts/_partials/entries/validateIds.html.
const LAYERS = [2];
const WIDTH = 4;

const slug = process.argv[2];
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || process.argv.length > 3) {
  console.error('usage: npm run new-entry -- <url-slug>   (lowercase, digits, dashes)');
  process.exit(1);
}

const ids = readdirSync(path.join(root, 'content', 'entries'), { recursive: true })
  .map((p) => path.basename(p))
  .filter((name) => new RegExp(`^\\d{${WIDTH}}$`).test(name))
  .map(Number);

const id = Math.max(...ids) + 1;
const padded = String(id).padStart(WIDTH, '0');
const buckets = LAYERS.map((mask) => padded.slice(0, WIDTH - mask) + 'x'.repeat(mask));
const file = path.join('content', 'entries', ...buckets, padded, 'index.md');

execFileSync('hugo', ['new', file], { cwd: root, stdio: 'inherit' });

const title = slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const text = readFileSync(path.join(root, file), 'utf8')
  .replace("title = 'Replace Me'", `title = '${title}'`)
  .replace("url     = '/entry/replace-me/'", `url     = '/entry/${slug}/'`);
if (!text.includes(slug)) throw new Error('archetype placeholders changed; update this script');
writeFileSync(path.join(root, file), text);

console.log(`created ${file} — entry #${id}, /entry/${slug}/`);
