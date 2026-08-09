#!/usr/bin/env node
// Standardizes all LDraw file headers and normalizes their format.
// In the header, it sets the author based on git author name where missing.
// Also removes all non-functional lines from the files.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { entryFile, entryIds } from './entry.js';
import { root } from './shared.js';

const LICENSE = 'Licensed under CC BY 4.0 : see https://brick.camp/legal';

const FILE_LINE = /^0 FILE (.*?)\s*$/;
const COMMENT = /^0($|\s)/;
const BODY_META = /^0 (STEP\b|MLCAD\b|GROUP\b|BFC\b|NOFILE\b|!LEOCAD\b|\/\/)/;
const CRUFT = /^0(\s*$|\s+(ROTATION (CENTER|CONFIG)\b|Name:|Author:|Unofficial Model|!LDRAW_ORG\b|!LICENSE\b|[Uu]ntitled( model)?$))/;
const OWN_AUTHOR = /^0 Author: (.+?) \[brick\.camp\]$/;
// What an editor writes when nobody named the model; the file name beats it.
const PLACEHOLDER = /^(untitled.*|new model|model)?$/i;

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// Repo-relative path -> author of the commit that added it. git log is
// newest-first, so on a delete-and-re-add the original author wins.
function authorsByPath() {
  const log = git('log', '--diff-filter=A', '--name-only', '--pretty=format:%x00%an', '--', 'content/entries');
  const map = new Map();
  let author;
  for (const line of log.split('\n')) {
    if (line.startsWith('\x00')) author = line.slice(1);
    else if (line) map.set(line, author);
  }
  return map;
}

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

const header = (description, name, author) => [
  `0 ${description}`,
  `0 Name: ${name}`,
  `0 Author: ${author} [brick.camp]`,
  '0 !LDRAW_ORG Unofficial_Model',
  `0 !LICENSE ${LICENSE}`,
];

// A sub-file keeps its own description unless the editor left a placeholder.
const subDescription = (description, name) =>
  PLACEHOLDER.test(description ?? '') ? path.parse(name).name : description;

function cleanBody(lines) {
  const kept = lines.filter((line) => !CRUFT.test(line));
  while (kept.length && !kept.at(-1).trim()) kept.pop();
  return kept;
}

function rewrite(file, title, mainName, fallbackAuthor) {
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

const modelFile = (dir) =>
  ['model.ldr', 'model.mpd'].map((name) => path.join(dir, name)).find((file) => existsSync(file));

const addedBy = authorsByPath();
const fallbackAuthor = git('config', 'user.name').trim();
let seen = 0;
let changed = 0;

for (const id of entryIds()) {
  const { dir } = entryFile(id);
  const model = modelFile(dir);
  if (!model) continue;

  const title = readFileSync(path.join(dir, 'index.md'), 'utf8')
    .match(/^title\s*=\s*(['"])(.*?)\1/m)?.[2];
  if (!title) throw new Error(`${path.relative(root, dir)}: no title in index.md`);

  seen += 1;
  const author = addedBy.get(path.relative(root, model)) ?? fallbackAuthor;
  if (rewrite(model, title, `brickcamp-${id}.ldr`, author)) changed += 1;
}

console.log(`${seen} model files, ${changed} rewritten`);
