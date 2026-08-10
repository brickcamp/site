// Everything the repo knows about LDraw files: the header every model
// carries, the stub a new entry's model starts as, and the parts a model
// references — resolved against the part pages already in content/parts.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { root } from './shared.js';

const LICENSE = 'Licensed under CC BY 4.0 : see https://brick.camp/legal';

const FILE_LINE = /^0 FILE (.*?)\s*$/;
// A type-1 line is "1 <colour> <12 numbers> <file>".
const REF_LINE = /^1(?:\s+\S+){13}\s+(.+?)\s*$/;
const COMMENT = /^0($|\s)/;
const BODY_META = /^0 (STEP\b|MLCAD\b|GROUP\b|BFC\b|NOFILE\b|!LEOCAD\b|\/\/)/;
const CRUFT = /^0(\s*$|\s+(ROTATION (CENTER|CONFIG)\b|Name:|Author:|Unofficial Model|!LDRAW_ORG\b|!LICENSE\b|[Uu]ntitled( model)?$))/;
const OWN_AUTHOR = /^0 Author: (.+?) \[brick\.camp\]$/;
// What an editor writes when nobody named the model; the file name beats it.
const PLACEHOLDER = /^(untitled.*|new model|model)?$/i;

export const gitAuthor = () =>
  execFileSync('git', ['config', 'user.name'], { cwd: root, encoding: 'utf8' }).trim();

export const modelFile = (dir) =>
  ['model.ldr', 'model.mpd'].map((name) => path.join(dir, name)).find((file) => existsSync(file));

const header = (description, name, author) => [
  `0 ${description}`,
  `0 Name: ${name}`,
  `0 Author: ${author} [brick.camp]`,
  '0 !LDRAW_ORG Unofficial_Model',
  `0 !LICENSE ${LICENSE}`,
];

export const modelName = (id) => `brickcamp-${Number(id)}.ldr`;

// What LeoCAD opens on a fresh entry: the house header and no parts. The
// name matches what normalizeModel would write anyway, so the first save
// round-trips unchanged.
export const stubModel = (id, title, author) =>
  header(title, modelName(id), author).join('\n') + '\n';

// An .mpd is a chain of 0 FILE blocks; an .ldr is one nameless block.
function splitBlocks(lines) {
  const starts = lines.flatMap((line, n) => (FILE_LINE.test(line) ? [n] : []));
  if (starts.length === 0) return [{ name: null, lines }];
  return starts.map((start, n) => ({
    name: lines[start].match(FILE_LINE)[1],
    lines: lines.slice(start + 1, starts[n + 1] ?? lines.length),
  }));
}

// Consumes a block's leading comments, keeping the two things the new
// header reuses: the description free-text line and a hand-written author.
function parseHeader(lines, file) {
  let description;
  let author;
  let i = 0;
  for (; i < lines.length; i += 1) {
    const line = lines[i].trimEnd();
    if (!COMMENT.test(line) || BODY_META.test(line)) break;
    if (line.startsWith('0 Author:')) {
      author = line.match(OWN_AUTHOR)?.[1];
    } else if (!CRUFT.test(line)) {
      const text = line.replace(/^0\s+/, '');
      if (description !== undefined) {
        throw new Error(`${file}: two description lines in one header ("${text}")`);
      }
      description = text;
    }
  }
  return { description, author, body: lines.slice(i) };
}

// A sub-file keeps its own description unless the editor left a placeholder.
const subDescription = (description, name) =>
  PLACEHOLDER.test(description ?? '') ? path.parse(name).name : description;

function cleanBody(lines) {
  const kept = lines.filter((line) => !CRUFT.test(line));
  while (kept.length && !kept.at(-1).trim()) kept.pop();
  return kept;
}

// Rewrites file in place to the house header format, dropping every
// non-functional line. Returns whether anything changed.
export function normalizeModel(file, title, mainName, fallbackAuthor) {
  const before = readFileSync(file, 'utf8');
  const lines = before.split(/\r?\n/);
  const blocks = splitBlocks(lines);
  const isMpd = blocks[0].name !== null;

  if (isMpd && path.extname(file) !== '.mpd') {
    throw new Error(`${file}: contains 0 FILE blocks — rename it to model.mpd`);
  }
  if (isMpd && !FILE_LINE.test(lines[0])) {
    throw new Error(`${file}: content before the first 0 FILE line`);
  }
  // The main block is renamed to mainName, so nothing may still point at it.
  const oldMainName = blocks[0].name ?? mainName;
  if (lines.some((line) => !line.startsWith('0') && line.includes(oldMainName))) {
    throw new Error(`${file}: main file ${oldMainName} is referenced by another block`);
  }

  const out = blocks.flatMap((block, n) => {
    const main = n === 0;
    const { description, author, body } = parseHeader(block.lines, file);
    const name = main ? mainName : block.name;
    return [
      ...(isMpd ? [`0 FILE ${name}`] : []),
      ...header(main ? title : subDescription(description, name), name, author ?? fallbackAuthor),
      ...cleanBody(body),
    ];
  });

  const text = out.join('\n') + '\n';
  if (text === before) return false;
  writeFileSync(file, text);
  return true;
}

// Every part the model places, in the order it places them, repeats included —
// so the length is the model's raw part count. Refs naming a 0 FILE block are
// followed instead of counted; a block never enters its own expansion twice.
export function partRefs(file) {
  const blocks = new Map(
    splitBlocks(readFileSync(file, 'utf8').split(/\r?\n/)).map((block) => [
      block.name?.toLowerCase(),
      block.lines,
    ])
  );
  const refs = [];

  const walk = (lines, open) => {
    for (const line of lines) {
      const ref = line.match(REF_LINE)?.[1];
      if (ref === undefined) continue;
      const name = ref.toLowerCase();
      if (blocks.has(name)) {
        if (!open.has(name)) walk(blocks.get(name), new Set(open).add(name));
      } else if (name.endsWith('.dat')) {
        refs.push(ref.slice(0, -'.dat'.length));
      }
    }
  };

  walk(blocks.values().next().value, new Set());
  return refs;
}

// Every number that reaches a part page, canonical or alias, lowercased.
// Canonicals are written last: one part's alias may be another's folder name.
export function partIndex() {
  const parts = path.join(root, 'content', 'parts');
  const index = new Map();
  const folders = readdirSync(parts).filter((number) =>
    existsSync(path.join(parts, number, '_index.md'))
  );

  for (const number of folders) {
    const text = readFileSync(path.join(parts, number, '_index.md'), 'utf8');
    for (const [, alias] of text.matchAll(/['"]\/parts\/([^'"/]+)['"]/g)) {
      index.set(alias.toLowerCase(), number);
    }
  }
  for (const number of folders) index.set(number.toLowerCase(), number);

  return index;
}

// LDraw numbers a mould variant by suffixing a letter ("3023b"); the part
// page is filed under the bare number. Returns null when nothing matches.
export function resolveRef(ref, index) {
  for (let candidate = ref.toLowerCase(); candidate; ) {
    const canonical = index.get(candidate);
    if (canonical) return canonical;
    const shorter = candidate.replace(/[a-z]$/, '');
    if (shorter === candidate) return null;
    candidate = shorter;
  }
  return null;
}
