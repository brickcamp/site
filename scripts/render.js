// The entry image: a headless LDView snapshot, trimmed and padded to
// 800x800, then squeezed through TinyPNG.
//
// Nothing is ever resampled, because LDView's EdgeThickness is a pixel
// width, not a model unit — a render twice as large draws the same 1px
// outline around a twice-as-large model, so downscaling would halve the
// weight of every line. Instead the snapshot is taken at the final content
// size and only padded out.
//
// The throwaway ini exists because LDView writes its preferences back on
// exit: it absorbs that, leaving both ldview.conf and the interactive
// LDView's own settings alone. It has to live in the repo — LDView's
// flatpak can see xdg-documents and nothing else, so /tmp is invisible to it.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { resolveApp } from './apps.js';
import { envKey, get, root } from './shared.js';

const SIZE = 800;
const FILL = 0.92;
const CONTENT = Math.round(SIZE * FILL);
const WHITE = '#ffffff';

// Used only by an entry with no render line of its own, so it has to agree
// with what the archetype writes into a new one — otherwise the same model
// comes out from opposite sides depending on which entry it sits in.
export const ANGLE = { lat: 30, lon: 45 };

const SCRATCH = path.join(root, '.ldview');

// Everything else — seams, edges, lighting, curve quality — is inherited
// from ldview.conf verbatim. That is the point of committing it.
const overrides = (canvas) => ({
  SaveWidth: canvas,
  SaveHeight: canvas,
  SaveActualSize: 0,
  SaveZoomToFit: 1,
  SaveAlpha: 0,
  BackgroundColor3: 16777215,
});

function writeIni(file, values) {
  const pending = new Map(Object.entries(values));
  const lines = readFileSync(path.join(root, 'ldview.conf'), 'utf8')
    .trimEnd()
    .split('\n')
    .map((line) => {
      const key = line.match(/^([^=\s]+)=/)?.[1];
      if (!pending.has(key)) return line;
      const value = pending.get(key);
      pending.delete(key);
      return `${key}=${value}`;
    });

  writeFileSync(file, [...lines, ...[...pending].map(([k, v]) => `${k}=${v}`), ''].join('\n'));
}

function snapshot(model, { lat, lon }) {
  mkdirSync(SCRATCH, { recursive: true });
  const ini = path.join(SCRATCH, 'render.ini');
  const out = path.join(SCRATCH, 'snapshot.png');
  writeIni(ini, overrides(CONTENT));

  const { command, args } = resolveApp('ldview');
  execFileSync(
    command,
    [
      ...args,
      model,
      `-IniFile=${ini}`,
      `-SaveSnapshot=${out}`,
      `-DefaultLatLong=${lat},${lon}`,
    ],
    // LDView chatters about Qt platform plugins on stderr; keep it unless it fails.
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  return out;
}

async function tinify(png, key) {
  const shrunk = await get('https://api.tinify.com/shrink', {
    method: 'POST',
    headers: { authorization: `Basic ${Buffer.from(`api:${key}`).toString('base64')}` },
    body: png,
  });
  if (!shrunk.ok) throw new Error(`shrink returned ${shrunk.status}`);

  const url = (await shrunk.json()).output?.url;
  if (!url) throw new Error('shrink returned no output url');

  const compressed = await get(url);
  if (!compressed.ok) throw new Error(`download returned ${compressed.status}`);
  return Buffer.from(await compressed.arrayBuffer());
}

async function compress(png) {
  const key = envKey('TINYPNG_API_KEY');
  if (key) {
    try {
      return await tinify(png, key);
    } catch (error) {
      console.warn(`tinypng: ${error.message} — falling back to the local quantizer`);
    }
  }
  return sharp(png).png({ palette: true, quality: 90, effort: 10 }).toBuffer();
}

// Renders model into target as an 800x800 PNG. Returns its size in bytes.
export async function renderImage(model, target, { lat = ANGLE.lat, lon = ANGLE.lon } = {}) {
  const { data, info } = await sharp(snapshot(model, { lat, lon }))
    .flatten({ background: WHITE })
    .trim({ threshold: 10 })
    .png()
    .toBuffer({ resolveWithObject: true });

  // Zoom-to-fit is meant to touch the border on the long axis, so only a
  // model touching on both is suspect: a clipped render, or a background
  // the trim could not tell from the model.
  if (info.width === CONTENT && info.height === CONTENT) {
    console.warn('warning: no white margin on either axis — clipped render or non-white background?');
  }

  const left = Math.round((SIZE - info.width) / 2);
  const top = Math.round((SIZE - info.height) / 2);

  const png = await sharp(data)
    .extend({
      top,
      left,
      bottom: SIZE - info.height - top,
      right: SIZE - info.width - left,
      background: WHITE,
    })
    .png()
    .toBuffer();

  const image = await compress(png);
  writeFileSync(target, image);
  return image.length;
}
