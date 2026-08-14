// The entry document — one content/entries/**/index.md, TOML front matter
// followed by a body of linkbox shortcodes. Every read and write of one
// goes through here, so the quoting rules are decided once.
//
// Values are replaced in place, never reserialized: the front matter is
// hand-ordered and hand-aligned (title/date/draft line up their '=', as do
// url/aliases/render), and a round trip through a TOML printer would reflow
// all 240 entries. Only the text between '=' and the end of the value moves.
//
// Every write re-reads the file first. A stage can sit for minutes on a
// build, a render or a question, and the file may well have been edited in
// the meantime — only the one field being written may change under you.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './shared.js';

// The fields the scripts read or write. Everything else in an entry's front
// matter — date, aliases, size, uses, tags — is maintained by hand and is
// deliberately not addressable here.
const FIELDS = {
  title: { type: 'string', required: true },
  url: { type: 'string', required: true },
  parts: { type: 'array', required: true },
  render: { type: 'table', required: false },
  draft: { type: 'bool', required: false },
};

// A new render line is aligned against this one, and inserted after it.
const ANGLE_ANCHOR = 'aliases';

/* -------------------------------------------------------------- reading -- */

// Splits '+++\n<front>\n+++<body>'. Returns null when the fences are absent,
// which is how a file that is not an entry document is told apart.
function sections(text) {
  if (!text.startsWith('+++\n')) return null;
  const close = text.indexOf('\n+++', 3);
  if (close === -1) return null;
  return { front: text.slice(4, close + 1), body: text.slice(close + 4), close };
}

// Index of the closing quote of the string starting at `start`.
function endOfString(text, start) {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i += 1) {
    if (quote === '"' && text[i] === '\\') i += 1;
    else if (text[i] === quote) return i;
  }
  return -1;
}

// Index of the bracket closing the one at `start`. Quoted spans are skipped,
// so a tag value like 'shape-polygon-[3-999]' cannot end the array early.
function endOfBracket(text, start, open, close) {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'" || c === '"') {
      const end = endOfString(text, i);
      if (end === -1) return -1;
      i = end;
    } else if (c === open) depth += 1;
    else if (c === close && (depth -= 1) === 0) return i;
  }
  return -1;
}

// Where the value of `name` sits inside the front matter, or null when the
// field is absent. `gap` is everything between the key and the value, kept
// verbatim on a write so the hand-made alignment survives.
function locate(front, name) {
  const key = new RegExp(`^${name}([ \\t]*=[ \\t]*)`, 'm');
  const found = key.exec(front);
  if (!found) return null;

  const start = found.index + found[0].length;
  const first = front[start];
  let end;
  if (first === "'" || first === '"') end = endOfString(front, start);
  else if (first === '[') end = endOfBracket(front, start, '[', ']');
  else if (first === '{') end = endOfBracket(front, start, '{', '}');
  else {
    const nl = front.indexOf('\n', start);
    end = (nl === -1 ? front.length : nl) - 1;
  }
  if (end === -1) return null;

  return { line: found.index, gap: found[1], start, end: end + 1 };
}

const unquote = (raw) =>
  raw[0] === "'" ? raw.slice(1, -1) : raw.slice(1, -1).replace(/\\(["\\])/g, '$1');

// Every quoted string inside an array, in order, either quote style.
function items(raw) {
  const out = [];
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] !== "'" && raw[i] !== '"') continue;
    const end = endOfString(raw, i);
    if (end === -1) break;
    out.push(unquote(raw.slice(i, end + 1)));
    i = end;
  }
  return out;
}

function parse(raw, type) {
  if (type === 'string') return raw[0] === "'" || raw[0] === '"' ? unquote(raw) : undefined;
  if (type === 'array') return raw[0] === '[' ? items(raw) : undefined;
  if (type === 'bool') return raw === 'true' ? true : raw === 'false' ? false : undefined;
  if (raw[0] !== '{') return undefined;
  const table = {};
  for (const [, key, value] of raw.matchAll(/([A-Za-z_][\w-]*)\s*=\s*(-?[\d.]+)/g)) {
    table[key] = Number(value);
  }
  return table;
}

/* -------------------------------------------------------------- writing -- */

// TOML literal strings cannot contain single quotes; fall back to a basic
// string. Same rule part.js uses for a part page.
const quote = (value) =>
  value.includes("'")
    ? `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
    : `'${value}'`;

function format(value, type) {
  if (type === 'string') return quote(value);
  if (type === 'array') return `[${value.map(quote).join(', ')}]`;
  if (type === 'bool') return String(value);
  return `{ ${Object.entries(value).map(([key, n]) => `${key} = ${n}`).join(', ')} }`;
}

/* ------------------------------------------------------------- document -- */

export function entryDoc(file) {
  const relative = path.relative(root, file);
  let text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  let sec = text === '' ? null : sections(text);

  const reread = () => {
    text = readFileSync(file, 'utf8');
    sec = sections(text);
    if (!sec) throw new Error(`${relative}: no +++ front matter`);
    return sec;
  };

  // Absent on a document that does not exist yet is not an error — the
  // scaffold stage's whole job is that state. Absent on one that does is.
  function read(name) {
    const field = FIELDS[name];
    if (!sec) return undefined;
    const at = locate(sec.front, name);
    if (!at) {
      if (field.required) throw new Error(`${relative}: no ${name} in the front matter`);
      return undefined;
    }
    const value = parse(sec.front.slice(at.start, at.end), field.type);
    if (value === undefined) {
      throw new Error(`${relative}: ${name} is not a readable ${field.type}`);
    }
    return value;
  }

  // Re-reads, replaces just this field's value, writes back.
  function write(name, value) {
    const front = reread().front;
    const at = locate(front, name);
    if (!at) throw new Error(`${relative}: no ${name} to set in the front matter`);
    const next =
      front.slice(0, at.start) + format(value, FIELDS[name].type) + front.slice(at.end);
    save(next);
  }

  function save(front) {
    writeFileSync(file, `+++\n${front}+++${sec.body}`);
    text = readFileSync(file, 'utf8');
    sec = sections(text);
  }

  return {
    get exists() {
      return sec !== null;
    },
    get title() {
      return read('title');
    },
    get url() {
      return read('url');
    },
    get parts() {
      return read('parts');
    },
    get angle() {
      return read('render');
    },
    get isDraft() {
      return read('draft') === true;
    },
    get hasLinkbox() {
      return (sec?.body ?? '').includes('{{< linkbox');
    },

    linksTo: (url) => (sec?.body ?? '').includes(`url="${url}"`),
    refresh: reread,

    setTitle: (value) => write('title', value),
    setUrl: (value) => write('url', value),
    setParts: (value) => write('parts', value),

    // The only field that may not be there yet: 239 of 240 entries predate
    // it. A new line is aligned against aliases and inserted after it, which
    // is where the archetype puts it.
    setAngle(value) {
      const front = reread().front;
      if (locate(front, 'render')) return write('render', value);

      const anchor = locate(front, ANGLE_ANCHOR);
      if (!anchor) {
        throw new Error(`${relative}: no ${ANGLE_ANCHOR} line to place render after`);
      }
      // Line the new '=' up with the anchor's, and reuse its trailing gap.
      const eq = anchor.gap.indexOf('=');
      const key = 'render'.padEnd(ANGLE_ANCHOR.length + eq) + anchor.gap.slice(eq);
      const eol = front.indexOf('\n', anchor.end) + 1;
      save(front.slice(0, eol) + key + format(value, 'table') + '\n' + front.slice(eol));
    },

    undraft() {
      const front = reread().front;
      const at = locate(front, 'draft');
      if (!at) return;
      save(front.slice(0, at.line) + front.slice(front.indexOf('\n', at.end) + 1));
    },

    appendLinkbox(shortcode) {
      reread();
      const body = sec.body.endsWith('\n') ? sec.body : `${sec.body}\n`;
      writeFileSync(file, `+++\n${sec.front}+++${body}\n${shortcode}`);
      text = readFileSync(file, 'utf8');
      sec = sections(text);
    },

    // The archetype ships an example linkbox; a fresh entry is not a source.
    stripArchetypeLinkbox() {
      reread();
      const body = sec.body.replace(
        /\n+\{\{< linkbox[\s\S]*?\{\{< \/linkbox >\}\}\n*/,
        '\n'
      );
      writeFileSync(file, `+++\n${sec.front}+++${body}`);
      text = readFileSync(file, 'utf8');
      sec = sections(text);
    },
  };
}
