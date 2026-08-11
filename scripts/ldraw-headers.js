#!/usr/bin/env node
// Standardizes all LDraw file headers and normalizes their format.
// In the header, it sets the author based on git author name where missing.
// Also removes all non-functional lines from the files.
//
// The parsing lives in model.js; this is the entry-by-entry half — which
// title the header gets, and who the author is when the file never said.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { entryDoc } from './entry-doc.js';
import { entryFile, entryIds } from './entry.js';
import { gitAuthor, modelFile, modelName, normalizeModel } from './model.js';
import { root } from './shared.js';

// Repo-relative path -> author of the commit that added it. git log is
// newest-first, so on a delete-and-re-add the original author wins.
function authorsByPath() {
  const log = execFileSync(
    'git',
    ['log', '--diff-filter=A', '--name-only', '--pretty=format:%x00%an', '--', 'content/entries'],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  const map = new Map();
  let author;
  for (const line of log.split('\n')) {
    if (line.startsWith('\x00')) author = line.slice(1);
    else if (line) map.set(line, author);
  }
  return map;
}

let addedBy;
let fallbackAuthor;

// Returns null when the entry has no model file yet, else whether the
// rewrite changed anything. Idempotent, so the stage runner can call it on
// every pass.
export function normalizeEntry(id) {
  const { dir } = entryFile(id);
  const model = modelFile(dir);
  if (!model) return null;

  const doc = entryDoc(path.join(dir, 'index.md'));
  if (!doc.exists) throw new Error(`${path.relative(root, dir)}: no index.md`);
  const title = doc.title;

  addedBy ??= authorsByPath();
  fallbackAuthor ??= gitAuthor();
  const author = addedBy.get(path.relative(root, model)) ?? fallbackAuthor;
  return normalizeModel(model, title, modelName(id), author);
}

if (process.argv[1] === import.meta.filename) {
  let seen = 0;
  let changed = 0;
  for (const id of entryIds()) {
    const rewritten = normalizeEntry(id);
    if (rewritten === null) continue;
    seen += 1;
    if (rewritten) changed += 1;
  }
  console.log(`${seen} model files, ${changed} rewritten`);
}
