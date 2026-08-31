// Creates content/parts/<number>/_index.md from the Rebrickable API and
// downloads the part image next to it.

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { envKey, get, root, tomlQuote } from './shared.js';
import { groupForCategory, withGroup } from './partgroup.js';

function frontMatter(part, group) {
  const aliases = [...new Set([...(part.molds ?? []), ...(part.alternates ?? [])])]
    .map((id) => `/parts/${id}`)
    .sort();

  let out = `+++\ntitle   = ${tomlQuote(part.name)}\n`;
  if (aliases.length > 0) {
    out += `aliases = [\n${aliases.map((a) => `  ${tomlQuote(a)},\n`).join('')}]\n`;
  }
  out += `\n[params]\n`;
  out += `rebrickablePage  = ${tomlQuote(part.part_url ?? '')}\n`;
  out += `rebrickableImage = ${tomlQuote(part.part_img_url ?? '')}\n`;
  out += `+++\n`;
  return group ? withGroup(out, group) : out;
}

// What Rebrickable knows about a part, page or no page — the parts stage
// reads molds/alternates from it to spot a number that is really an alias.
export async function lookupPart(number) {
  const key = envKey('REBRICKABLE_API_KEY');
  if (!key) throw new Error('REBRICKABLE_API_KEY not set; copy .env.example to .env and fill it in');

  const response = await get(
    `https://rebrickable.com/api/v3/lego/parts/${encodeURIComponent(number)}/?key=${key}`
  );
  if (!response.ok) {
    throw new Error(`Rebrickable API returned ${response.status} for part ${number}`);
  }
  return response.json();
}

export async function createPart(number) {
  const dir = path.join(root, 'content', 'parts', number);
  if (existsSync(path.join(dir, '_index.md'))) {
    throw new Error(`content/parts/${number}/_index.md already exists`);
  }

  const part = await lookupPart(number);
  const group = await groupForCategory(part.part_cat_id);

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, '_index.md'), frontMatter(part, group));

  if (part.part_img_url) {
    const image = await get(part.part_img_url);
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
