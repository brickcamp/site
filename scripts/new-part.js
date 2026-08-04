#!/usr/bin/env node
// Creates content/parts/<number>/_index.md plus its image.
//
// Usage: npm run new-part -- <part-number> [<part-number> ...]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// TOML literal strings cannot contain single quotes; fall back to a basic string.
const toml = (value) =>
  value.includes("'")
    ? `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
    : `'${value}'`;

async function apiKey() {
  if (process.env.REBRICKABLE_API_KEY) return process.env.REBRICKABLE_API_KEY;
  const env = await readFile(path.join(root, '.env'), 'utf8').catch(() => '');
  const key = env.match(/^REBRICKABLE_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!key) throw new Error('REBRICKABLE_API_KEY not set; copy .env.example to .env and fill it in');
  return key;
}

function frontMatter(part) {
  const aliases = [...new Set([...(part.molds ?? []), ...(part.alternates ?? [])])]
    .map((id) => `/parts/${id}`)
    .sort();

  let out = `+++\ntitle   = ${toml(part.name)}\n`;
  if (aliases.length > 0) {
    out += `aliases = [\n${aliases.map((a) => `  ${toml(a)},\n`).join('')}]\n`;
  }
  out += `\n[params]\n`;
  out += `rebrickablePage  = ${toml(part.part_url ?? '')}\n`;
  out += `rebrickableImage = ${toml(part.part_img_url ?? '')}\n`;
  out += `+++\n`;
  return out;
}

async function createPart(number, key) {
  const dir = path.join(root, 'content', 'parts', number);
  if (existsSync(path.join(dir, '_index.md'))) {
    throw new Error(`content/parts/${number}/_index.md already exists`);
  }

  const response = await fetch(
    `https://rebrickable.com/api/v3/lego/parts/${encodeURIComponent(number)}/?key=${key}`
  );
  if (!response.ok) {
    throw new Error(`Rebrickable API returned ${response.status} for part ${number}`);
  }
  const part = await response.json();

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, '_index.md'), frontMatter(part));

  if (part.part_img_url) {
    const image = await fetch(part.part_img_url);
    if (!image.ok) {
      throw new Error(`image download returned ${image.status} for part ${number}`);
    }
    const ext = path.extname(new URL(part.part_img_url).pathname) || '.jpg';
    await writeFile(path.join(dir, `image${ext}`), Buffer.from(await image.arrayBuffer()));
  } else {
    console.warn(`warning: part ${number} has no image on Rebrickable`);
  }

  console.log(`created content/parts/${number} (${part.name})`);
}

const numbers = process.argv.slice(2);
if (numbers.length === 0) {
  console.error('usage: npm run new-part -- <part-number> [<part-number> ...]');
  process.exit(1);
}

const key = await apiKey();
let failed = false;
for (const number of numbers) {
  try {
    await createPart(number, key);
  } catch (error) {
    console.error(`error: ${error.message}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
