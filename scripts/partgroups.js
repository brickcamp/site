#!/usr/bin/env node
// Files every untagged part into a part group, creating the group pages it
// needs: npm run partgroups reports what it would do, --write does it.
//
// Write-once, so re-running only ever picks up parts added since. A part
// Rebrickable does not know stays untagged and is named in the report — it
// then shows in the part list as a card of its own.

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { apiKey, groupForCategory, groupOf, partNumberOf, withGroup } from './partgroup.js';
import { get, root } from './shared.js';

const BATCH = 100;
const write = process.argv.includes('--write');
const partsDir = path.join(root, 'content', 'parts');

const untagged = new Map();
for (const dir of (await readdir(partsDir, { withFileTypes: true })).filter((e) => e.isDirectory())) {
  const file = path.join(partsDir, dir.name, '_index.md');
  const frontMatter = await readFile(file, 'utf8').catch(() => null);
  if (frontMatter === null || groupOf(frontMatter)) continue;

  const number = partNumberOf(frontMatter);
  if (!number) {
    console.warn(`warning: ${dir.name} names no Rebrickable page`);
    continue;
  }
  untagged.set(dir.name, { file: file, frontMatter: frontMatter, number: number });
}

if (untagged.size === 0) {
  console.log('0 parts to file');
  process.exit(0);
}

const numbers = [...untagged.values()].map((part) => part.number);
const category = new Map();
for (let i = 0; i < numbers.length; i += BATCH) {
  const batch = numbers.slice(i, i + BATCH).map(encodeURIComponent).join(',');
  const response = await get(
    `https://rebrickable.com/api/v3/lego/parts/?part_nums=${batch}&page_size=${BATCH}&key=${await apiKey()}`
  );
  if (!response.ok) {
    throw new Error(`Rebrickable API returned ${response.status} for ${batch.slice(0, 40)}…`);
  }
  for (const part of (await response.json()).results) {
    category.set(part.part_num, part.part_cat_id);
  }
}

const filed = new Map();
const unknown = [];
for (const [id, part] of untagged) {
  const categoryId = category.get(part.number);
  if (categoryId === undefined) {
    unknown.push(`${id} (${part.number})`);
    continue;
  }

  const slug = await groupForCategory(categoryId, { write: write });
  if (write) {
    await writeFile(part.file, withGroup(part.frontMatter, slug));
  }
  filed.set(slug, (filed.get(slug) ?? 0) + 1);
}

for (const [slug, count] of [...filed].sort()) {
  const parts = `${String(count).padStart(3)} part${count === 1 ? ' ' : 's'}`;
  console.log(`${write ? 'filed' : 'would file'} ${parts} in ${slug}`);
}
console.log(`${filed.size} groups, ${[...filed.values()].reduce((a, b) => a + b, 0)} parts`);

if (unknown.length > 0) {
  console.warn(`warning: unknown to Rebrickable, left ungrouped: ${unknown.join(', ')}`);
}
if (!write) {
  console.log('dry run — pass --write to apply');
}
