#!/usr/bin/env node
// npm run entry — the resumable stage runner behind a new entry.
//
//   npm run entry [id] [stage] [-- --lat n --lon n --supersample n]
//
// Both positionals are optional and either order works: a pure number is the
// id (the newest entry without one), a word is the stage.
//
// Building the model takes an hour, so nothing here assumes the terminal
// stayed open. Every stage detects on its own whether it is already done by
// looking at the entry folder — there is no progress file — which is also
// what makes each of them individually re-runnable and idempotent. Give a
// stage name to run just that one.

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { launch, open } from './apps.js';
import { entryDoc } from './entry-doc.js';
import { createEntry, entryFile, highestId, isEntryId, isSlug } from './entry.js';
import { normalizeEntry } from './ldraw-headers.js';
import { addLink } from './link.js';
import { RenameToMpd, modelFile, partIndex, partRefs, resolveRef } from './model.js';
import { createPart, lookupPart } from './part.js';
import { ask, closePrompt, confirm, isNo, isYes, question } from './prompt.js';
import { ANGLE, renderImage } from './render.js';
import { root } from './shared.js';

const PLACEHOLDER_PARTS = ['3002', '3004'];

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
// stdin is withheld from every child: readline owns the terminal, and a
// child that closes it would look to us like the user pressing Ctrl-D.
const hugo = (...args) =>
  execFileSync('hugo', args, { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });

// The archetype's example parts, still untouched.
const isPlaceholder = (parts) => String(parts) === String(PLACEHOLDER_PARTS);

function load(id) {
  const found = entryFile(id);
  return {
    ...found,
    number: Number(found.id),
    doc: entryDoc(found.file),
    model: existsSync(found.dir) ? modelFile(found.dir) : undefined,
    image: path.join(found.dir, 'image.png'),
  };
}

const relative = (file) => path.relative(root, file);

/* ------------------------------------------------------------- preview -- */

const freePort = () =>
  new Promise((resolve) => {
    const probe = createServer();
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

async function reachable(address) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(address)).ok) return true;
    } catch {
      // Still starting up.
    }
    await new Promise((wait) => setTimeout(wait, 250));
  }
  return false;
}

// A built page links its stylesheet and its image from the site root, so
// opening the file itself shows neither. hugo server puts the page where
// those links resolve — on a port of its own, so a dev server already
// running is left alone, and only for as long as you are looking.
async function preview(url) {
  const port = await freePort();
  const server = spawn('hugo', ['server', '--port', String(port), '--disableLiveReload'], {
    cwd: root,
    stdio: 'ignore',
  });
  const address = `http://localhost:${port}${url}`;

  try {
    if (!(await reachable(address))) {
      console.warn('warning: hugo server did not come up — skipping the browser preview');
      return;
    }
    open(address);
    await question(`showing ${address} — enter when you have had a look`);
  } finally {
    server.kill();
  }
}

/* -------------------------------------------------------------- stages -- */

// A ref with no part page may still be a Rebrickable alias of one we do
// have — the "search the workspace to see if it's aliased" step, automated.
async function lookupAlias(ref, index) {
  const part = await lookupPart(ref).catch((error) => {
    console.log(`  ${ref}: ${error.message}`);
    return null;
  });
  if (!part) return null;

  const related = [...(part.molds ?? []), ...(part.alternates ?? [])].map(String);
  const canonical = related.map((number) => index.get(number.toLowerCase())).find(Boolean);
  if (canonical) console.log(`  ${ref} → ${canonical} (Rebrickable calls them the same part)`);
  else console.log(`  ${ref}: no part page yet — Rebrickable calls it "${part.name}"`);
  return canonical;
}

async function derivedParts(entry, index) {
  const derived = [];
  for (const ref of new Set(partRefs(entry.model))) {
    // Unresolved refs stay in the list so they can be reviewed, but they
    // never mint a part page on their own — that is how junk pages happen.
    const canonical = resolveRef(ref, index) ?? (await lookupAlias(ref, index)) ?? ref;
    if (!derived.includes(canonical)) derived.push(canonical);
  }
  return derived;
}

const STAGES = [
  {
    name: 'scaffold',
    done: (entry) => entry.doc.exists,
    async run() {
      const slug = await ask('url slug', undefined, isSlug, 'lowercase, digits, dashes');
      return createEntry(slug);
    },
  },

  {
    name: 'model',
    done: (entry) => Boolean(entry.model) && partRefs(entry.model).length > 0,
    summary: (entry) => `${partRefs(entry.model).length} parts`,
    async run(entry) {
      launch('leocad', [entry.model]);
      console.log(`LeoCAD is building ${relative(entry.model)} — save as you go.`);
      if (await confirm('open LDView alongside as a live preview?')) {
        launch('ldview', [entry.model]);
        console.log('  LDView repolls the file every 3s, so a save refreshes it.');
      }
      console.log('preview the site with `hugo server -D` — a draft entry is invisible without it.');
    },
  },

  {
    name: 'render',
    done: (entry) => existsSync(entry.image),
    async run(entry, flags) {
      // angle might have changed on a retry
      entry.doc.refresh();

      const stored = entry.doc.angle;
      const angle = {
        lat: flags.lat ?? stored?.lat ?? ANGLE.lat,
        lon: flags.lon ?? stored?.lon ?? ANGLE.lon,
      };

      console.log(`rendering at lat ${angle.lat}, lon ${angle.lon}…`);
      const bytes = await renderImage(entry.model, entry.image, {
        ...angle,
        supersample: flags.supersample ?? 1,
      });

      // save angle so future re-renders look identical
      entry.doc.setAngle(angle);

      console.log(`wrote ${relative(entry.image)} — ${(bytes / 1024).toFixed(1)} KB`);
      open(entry.image);
    },
  },

  {
    name: 'parts',
    done: (entry) => !isPlaceholder(entry.doc.parts),
    summary: (entry) => `${entry.doc.parts.length} declared`,
    async run(entry) {
      const index = partIndex();
      const declared = entry.doc.parts;
      const kept = isPlaceholder(declared) ? [] : declared;

      console.log('reading the model…');
      const derived = await derivedParts(entry, index);
      // The declaration is importance-ordered by hand, so whatever is
      // already there keeps its place and the model only appends.
      const suggested = [...kept, ...derived].filter((n, i, all) => all.indexOf(n) === i);

      const chosen = (await question('parts', suggested.join(' '))).split(/\s+/).filter(Boolean);
      entry.doc.setParts(chosen);

      for (const number of chosen.filter((n) => !index.has(n.toLowerCase()))) {
        if (await confirm(`part ${number} has no page — create it from Rebrickable?`)) {
          await createPart(number).catch((error) => console.error(`error: ${error.message}`));
        }
      }
    },
  },

  {
    name: 'sources',
    done: (entry) => entry.doc.hasLinkbox,
    async run(entry) {
      for (;;) {
        const url = await ask(
          'source url (empty when done)',
          '',
          (answer) => answer === '' || URL.canParse(answer),
          'a full url, including https://'
        );
        if (!url) return;
        await addLink(entry.id, url).catch((error) => console.error(`error: ${error.message}`));
      }
    },
  },

  {
    name: 'verify',
    // Undrafting is the last thing verify does, so its absence is the mark.
    done: (entry) => !entry.doc.isDraft,
    async run(entry) {
      // Read before undrafting: the url is what tells us where the page
      // should have landed, and undrafting rewrites the file underneath.
      const url = entry.doc.url;
      // Drafts are excluded from .Pages, so none of the entry partials run
      // on one: the production build would report clean having checked
      // nothing about this entry. This is the build that fires its errorfs.
      console.log('building with drafts — this is the one that checks the entry…');
      hugo('-D', '--gc');

      entry.doc.undraft();
      console.log('undrafted; building for real…');
      hugo('--gc', '--minify');

      const page = path.join(root, 'public', ...url.split('/').filter(Boolean), 'index.html');
      if (!existsSync(page)) {
        throw new Error(`${relative(page)} was not built — the entry is still being excluded`);
      }
      console.log(`verified — ${relative(page)} is there`);
      await preview(url);
    },
  },

  {
    name: 'commit',
    done: (entry) => git('status', '--porcelain', '--', entry.dir).trim() === '',
    async run(entry) {
      const parts = git('status', '--porcelain', '--', path.join(root, 'content', 'parts'))
        .split('\n')
        .filter(Boolean)
        .map((line) => line.slice(3));
      const paths = [relative(entry.dir), ...parts];

      console.log(`committing:\n${paths.map((p) => `  ${p}`).join('\n')}`);
      if (!(await confirm('go ahead?'))) return;

      git('add', '--', ...paths);
      git('commit', '-m', `Add entry "${entry.doc.title}"`);
      console.log('committed');
    },
  },
];

/* -------------------------------------------------------------- runner -- */

// Nothing is done before the folder exists — scaffold's own test is that
// the entry has an index.md, so this covers every stage at once.
const isDone = (stage, entry) => entry.doc.exists && stage.done(entry);

// Yes takes the stage offered, no stops, and a stage name — or any
// unambiguous start of one — goes there instead. Stages are re-runnable and
// detect their own state, so jumping backwards to redo one is fair game and
// jumping forwards only risks the stage finding nothing to do.
// Nothing is suggested once every stage is done; the prompt then only takes
// a name, so a finished entry can still be sent back through a stage.
async function chooseStage(suggested) {
  const names = STAGES.map((stage) => stage.name);
  const prompt = suggested
    ? `next: ${suggested.name}? [Y/n or stage]`
    : 'every stage done — re-run one? [stage or n]';

  for (;;) {
    const answer = (await question(prompt)).toLowerCase();
    if (!answer || isYes(answer)) return suggested;
    if (isNo(answer)) return undefined;

    const matched = names.filter((name) => name.startsWith(answer));
    if (matched.length === 1) return STAGES.find((stage) => stage.name === matched[0]);
    console.log(`  (${matched.length > 1 ? matched.join(' or ') : names.join(', ')}?)`);
  }
}

function report(entry) {
  const title = entry.doc.title;
  console.log(`\nentry ${entry.number} ${title ? `"${title}"` : '(not created yet)'}`);
  const cells = STAGES.map((stage) => {
    const done = isDone(stage, entry);
    const note = done && stage.summary ? ` (${stage.summary(entry)})` : '';
    return `${done ? '✓' : '✗'} ${stage.name}${note}`;
  });
  console.log(`  ${cells.join('   ')}`);
}

export async function runStages(id, flags = {}, only) {
  for (;;) {
    let entry = load(id);
    if (entry.model) {
      try {
        normalizeEntry(id);
      } catch (error) {
        if (!(error instanceof RenameToMpd)) throw error;
        if (!(await confirm(`${error.message} — rename now?`))) throw error;
        renameSync(error.file, error.target);
        normalizeEntry(id);
      }
      entry = load(id);
    }

    report(entry);
    const stage = only
      ? STAGES.find((s) => s.name === only)
      : await chooseStage(STAGES.find((s) => !isDone(s, entry)));
    if (!stage) return;

    console.log('');
    id = (await stage.run(entry, flags)) ?? id;
    if (only) return;

    entry = load(id);
    if (!isDone(stage, entry)) {
      console.log(`\n${stage.name} isn't finished — pick up with \`npm run entry ${entry.number}\`.`);
      return;
    }
  }
}

if (process.argv[1] === import.meta.filename) {
  const argv = process.argv.slice(2);
  const flags = {};
  const args = [];
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i].match(/^--([a-z]+)(?:=(.*))?$/);
    if (flag) flags[flag[1]] = Number(flag[2] ?? argv[(i += 1)]);
    else args.push(argv[i]);
  }

  // The two positionals are told apart by shape rather than by place — a
  // pure number is the id, anything else the stage — so either may stand
  // alone and the newest entry fills in for a missing id.
  const digits = (arg) => /^\d+$/.test(arg);
  const [id = String(highestId()), ...spare] = args.filter(digits);
  const [only, ...unknown] = args.filter((arg) => !digits(arg));
  const extra = spare[0] ?? unknown[0];
  if (extra) throw new Error(`unexpected argument ${extra} — usage: entry [id] [stage]`);
  if (!isEntryId(id)) throw new Error(`${id} is not an entry number`);
  if (only && !STAGES.some((stage) => stage.name === only)) {
    throw new Error(`no stage called ${only} — try ${STAGES.map((s) => s.name).join(', ')}`);
  }

  try {
    await runStages(id, flags, only);
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    closePrompt();
  }
}
