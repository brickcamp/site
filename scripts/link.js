// Appends a linkbox shortcode to an entry, and saves the 150x150
// link_xx.jpg preview images next to it — on its own via addLinkImage, for
// linkboxes written by hand.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { entryFile } from './entry.js';
import { get } from './shared.js';
import { collect, FIELDS } from './link-metadata.js';

function entry(id) {
  const found = entryFile(id);
  if (!existsSync(found.file)) throw new Error(`no entry at ${found.relative}`);
  return found;
}

async function nextImageName(dir) {
  const taken = (await readdir(dir))
    .map((name) => Number(name.match(/^link_(\d+)\./)?.[1]))
    .filter(Number.isFinite);
  return `link_${String(Math.max(0, ...taken) + 1).padStart(2, '0')}.jpg`;
}

async function saveImage(imageURL, file) {
  const response = await get(imageURL);
  if (!response.ok) throw new Error(`image download returned ${response.status}`);
  await sharp(Buffer.from(await response.arrayBuffer()))
    .resize(150, 150, { fit: 'cover' })
    .jpeg({ quality: 80, progressive: true, mozjpeg: true })
    .toFile(file);
}

function shortcode(info, imageName) {
  const attr = (value) => `"${(value ?? '').replaceAll('"', '&quot;')}"`;
  let out = '{{< linkbox\n';
  out += `    author=${attr(info.author)}\n`;
  out += `    date=${attr(info.date)}\n`;
  if (imageName) out += `    image="${imageName}"\n`;
  out += `    title=${attr(info.title)}\n`;
  out += `    url=${attr(info.url)}\n`;
  out += info.description ? `>}}\n${info.description}\n{{< /linkbox >}}\n` : '/>}}\n';
  return out;
}

export async function addLink(entryId, url) {
  const { id, dir, file, relative } = entry(entryId);

  let markdown = await readFile(file, 'utf8');
  const info = await collect(url);
  for (const linked of new Set([url, info.url])) {
    if (markdown.includes(`url="${linked}"`)) {
      throw new Error(`entry ${id} already links ${linked}`);
    }
  }

  let imageName;
  if (info.image) {
    imageName = await nextImageName(dir);
    try {
      await saveImage(info.image, path.join(dir, imageName));
    } catch (error) {
      console.warn(`image: ${error.message}`);
      imageName = undefined;
    }
  }

  if (!markdown.endsWith('\n')) markdown += '\n';
  await writeFile(file, `${markdown}\n${shortcode(info, imageName)}`);

  const missing = FIELDS.filter((field) => !info[field] && field !== 'image');
  if (!imageName) missing.push('image');
  console.log(`appended linkbox to ${relative}${imageName ? ` (${imageName})` : ''}`);
  if (missing.length > 0) console.warn(`fill in by hand: ${missing.join(', ')}`);
}

export async function addLinkImage(entryId, imageURL) {
  const { dir, relative } = entry(entryId);
  const imageName = await nextImageName(dir);
  await saveImage(imageURL, path.join(dir, imageName));
  console.log(`saved ${path.dirname(relative)}/${imageName}`);
}
