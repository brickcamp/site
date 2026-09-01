#!/usr/bin/env node
// npm run entry — the resumable stage runner behind a new entry, drawn as a
// board: the seven stages across the top as a tab bar, and under it whatever
// the cursor is on. Left and right move, enter runs, a stage's first letter
// jumps to it, q leaves.
//
//   npm run entry [id]
//
// Modelling can take a while, so nothing here assumes the terminal
// stayed open. Every stage detects on its own whether it is already done by
// looking at the entry folder — there is no progress file — which is also
// what makes each of them individually re-runnable and idempotent. The board
// reads that detection once per load and paints the tabs from it.
//
// The seven stages are not the whole entry: the size and the tags (including
// partcount-) are yours to write by hand afterwards, and no stage here
// touches them.

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, renameSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { launch, open } from './apps.js';
import { entryEditor } from './entry-editor.js';
import { createEntry, entryFile, highestId, isEntryId, isSlug } from './entry.js';
import { normalizeEntry } from './ldraw-headers.js';
import { addLink } from './link.js';
import { RenameToMpd, modelFile, partIndex, partRefs, resolveRef } from './model.js';
import { createPart, lookupPart } from './part.js';
import { VIEW, renderImage } from './render.js';
import { root } from './shared.js';
import { titleCase, titleIssues } from './title.js';
import {
  Abort,
  COLUMNS,
  ENTER,
  ESC,
  LEFT,
  RIGHT,
  UP,
  DOWN,
  ask,
  block,
  bold,
  boldBlue,
  boldGreen,
  boldWhite,
  bye,
  clear,
  confirm,
  dim,
  green,
  question,
  readKey,
  reading,
  red,
  say,
  sgr,
  wrap,
  yellow,
} from './tui.js';

const PLACEHOLDER_PARTS = ['3002', '3004'];

// A failed child says nothing useful in its message — the reason is in the
// output it already printed — so the note under the board can only name it.
// execFileSync doesn't put the name on the error, so we do.
function child(command, args, options) {
  try {
    return execFileSync(command, args, { cwd: root, ...options });
  } catch (error) {
    error.command ??= command;
    throw error;
  }
}

const git = (...args) => child('git', args, { encoding: 'utf8' });
// stdin is withheld from every child: the board owns the terminal, and a
// child reading it would swallow the keys meant for the tabs.
const hugo = (...args) => child('hugo', args, { stdio: ['ignore', 'inherit', 'inherit'] });

// The archetype's example parts, still untouched.
const isPlaceholder = (parts) => String(parts) === String(PLACEHOLDER_PARTS);

const relative = (file) => path.relative(root, file);
const kb = (file) => `${(statSync(file).size / 1024).toFixed(1)} KB`;

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
      say(`${yellow('warning')}: hugo server did not come up — skipping the browser preview`);
      return;
    }
    open(address);
    await question({ prompt: `  ${dim(`showing ${address} — enter when you have had a look`)}` });
  } finally {
    server.kill();
  }
}

/* ---------------------------------------------------------------- slug -- */

// Typed straight into the shape a slug has to be in: a space or an underscore
// lands as a dash, a capital as its lowercase, and anything else never
// appears at all. So does a dash that would double up or lead, which leaves
// only the trailing one to tidy at the end.
const slugKey = (key, text, at) => {
  const character = /[\s_]/.test(key) ? '-' : key.toLowerCase();
  if (!/^[a-z0-9-]$/.test(character)) return '';
  if (character === '-' && (at === 0 || text[at - 1] === '-')) return '';
  return character;
};

async function askSlug() {
  say(boldWhite('  Provide the url slug of your new entry. The title gets derived from it.'));
  say();
  say(dim('  Lowercase words joined by dashes, e.g. hinge-plate-1x2 or snot-bracket-stack.'));
  say(dim('  Type it however you like — spaces and capitals are shaped as you go.'));
  say();

  const typed = await ask({
    prompt: '  slug',
    filter: slugKey,
    valid: (answer) => isSlug(answer.replace(/-+$/, '')),
    hint: 'at least one word',
    preview: (text) => {
      const slug = text.replace(/-+$/, '');
      return slug
        ? `  ${dim('→ titled')} ${bold(titleCase(slug))}${dim(`, at /entry/${slug}/`)}`
        : dim('  → the title and the url appear here as you type');
    },
  });
  return typed.replace(/-+$/, '');
}

/* -------------------------------------------------------------- stages -- */

// A ref with no part page may still be a Rebrickable alias of one we do
// have — the "search the workspace to see if it's aliased" step, automated.
async function lookupAlias(ref, index) {
  const part = await lookupPart(ref).catch((error) => {
    say(`  ${ref}: ${error.message}`);
    return null;
  });
  if (!part) return null;

  const related = [...(part.molds ?? []), ...(part.alternates ?? [])].map(String);
  const canonical = related.map((number) => index.get(number.toLowerCase())).find(Boolean);
  if (canonical) say(`  ${dim(`${ref} → ${canonical} (Rebrickable calls them the same part)`)}`);
  else say(`  ${dim(`${ref}: no part page yet — Rebrickable calls it "${part.name}"`)}`);
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

// One number, offering what the last render used as the default.
const askNumber = async (name, fallback, valid = () => true, hint = 'a number') =>
  Number(
    await ask({
      prompt: `  ${name}`,
      fallback: String(fallback),
      valid: (a) => Number.isFinite(Number(a)) && valid(Number(a)),
      hint,
    })
  );

// does: the sentence about the machine. you: the sentence about the human.
// Both are shown on the tab before it runs, doing while it is running.
const STAGES = [
  {
    name: 'scaffold',
    doing: 'Creating folder and files',
    does: 'Creates the entry folder — an index.md from the archetype, and a header-only model.ldr.',
    you: 'You give it a url slug, and the title is derived from that.',
    // The stage that mints the entry, so it never runs twice: a second pass
    // would mint a second one. Abort it and there is nothing to come back to.
    once: true,
    done: (entry) => entry.doc.exists,
    summary: () => 'index.md and model.ldr in place',
    run: async () => createEntry(await askSlug()),
  },

  {
    name: 'model',
    doing: 'Building the model in LeoCAD',
    does: 'Opens model.ldr in LeoCAD so you can build the technique.',
    you:
      'You build it, saving as you go. This is the long one — closing the terminal is fine, ' +
      '`npm run entry` picks you up right here.',
    done: (entry) => Boolean(entry.model) && partRefs(entry.model).length > 0,
    summary: (entry) => `${partRefs(entry.model).length} parts in the model`,
    async run(entry) {
      launch('leocad', [entry.model]);
      say(`  ${dim(`LeoCAD is building ${relative(entry.model)} — save as you go.`)}`);
      say();
      // Keep alive through the build; closing the terminal is still fine, as stage gets re-detected.
      await confirm('  Saved, and ready to carry on?');
    },
  },

  {
    name: 'render',
    doing: 'Rendering the image',
    does: 'Runs LDView over the model and writes image.png next to it.',
    you: 'You look at the render, and either take it or nudge the camera and go again.',
    done: (entry) => existsSync(entry.image),
    summary: (entry) => `image.png, ${kb(entry.image)}`,
    async run(entry) {
      // the view might have changed on a retry
      entry.doc.refresh();

      // An entry written before a key existed is missing it, so VIEW fills in.
      let view = { ...VIEW, ...entry.doc.view };
      for (;;) {
        say(`  ${dim(`rendering at lat ${view.lat}, lon ${view.lon}, fov ${view.fov}…`)}`);
        const bytes = await renderImage(entry.model, entry.image, view);

        // save the view so future re-renders look identical
        entry.doc.setView(view);

        say(`  ${dim(`wrote ${relative(entry.image)} — ${(bytes / 1024).toFixed(1)} KB`)}`);
        open(entry.image);
        say();

        if (await confirm('  Happy with this camera angle?')) return;
        say();
        say(dim('  Latitude and longitude move the camera; fov is 1 to 90 degrees.'));
        view = {
          lat: await askNumber('lat', view.lat),
          lon: await askNumber('lon', view.lon),
          fov: await askNumber('fov', view.fov, (n) => n >= 1 && n <= 90, '1 to 90 degrees'),
        };
        say();
      }
    },
  },

  {
    name: 'parts',
    doing: 'Reading and confirming the parts',
    does: 'Reads the parts out of the model and resolves Rebrickable aliases.',
    you: 'You correct the list it hands back. The order matters — most telling part first.',
    done: (entry) => !isPlaceholder(entry.doc.parts),
    summary: (entry) => `${entry.doc.parts.length} declared`,
    async run(entry) {
      const index = partIndex();
      const declared = entry.doc.parts;
      const kept = isPlaceholder(declared) ? [] : declared;

      say(`  ${dim('reading the model…')}`);
      const derived = await derivedParts(entry, index);
      // The declaration is importance-ordered by hand, so whatever is
      // already there keeps its place and the model only appends.
      const suggested = [...kept, ...derived].filter((n, i, all) => all.indexOf(n) === i);
      say();

      const chosen = (
        await question({ prompt: `  ${bold('parts')}`, prefill: suggested.join(' ') })
      )
        .split(/\s+/)
        .filter(Boolean);
      entry.doc.setParts(chosen);
      say();

      for (const number of chosen.filter((n) => !index.has(n.toLowerCase()))) {
        if (await confirm(`  Part ${number} has no page yet — create it from Rebrickable?`)) {
          await createPart(number).catch((error) => say(`  ${red('error')}: ${error.message}`));
        }
      }
    },
  },

  {
    name: 'sources',
    doing: 'Adding sources',
    does: 'Adds a linkbox for every source url, with its title and preview image fetched for you.',
    you: 'You paste one url per line, and press enter on an empty line when there are no more.',
    done: (entry) => entry.doc.hasLinkbox,
    summary: (entry) => `${entry.doc.linkboxes} linked`,
    async run(entry) {
      for (;;) {
        const url = await ask({
          prompt: '  source url',
          valid: (answer) => answer === '' || URL.canParse(answer),
          hint: 'a full url, including https://',
        });
        if (!url) return;
        await addLink(entry.id, url).catch((error) => say(`  ${red('error')}: ${error.message}`));
      }
    },
  },

  {
    name: 'verify',
    doing: 'Building and checking the entry',
    does:
      'Builds the site with drafts — the only build that checks this entry — then undrafts it, ' +
      'builds for real, and opens the page.',
    you: 'You look at the page, and press enter once you have had a look.',
    // Undrafting is the last thing verify does, so its absence is the mark.
    done: (entry) => !entry.doc.isDraft,
    summary: () => 'built and undrafted',
    async run(entry) {
      // Read before undrafting: the url is what tells us where the page
      // should have landed, and undrafting rewrites the file underneath.
      const url = entry.doc.url;
      // Drafts are excluded from .Pages, so none of the entry partials run
      // on one: the production build would report clean having checked
      // nothing about this entry. This is the build that fires its errorfs.
      say(`  ${dim('building with drafts — this is the one that checks the entry…')}`);
      hugo('-D', '--gc');

      entry.doc.undraft();
      say(`  ${dim('undrafted; building for real…')}`);
      hugo('--gc', '--minify');

      const page = path.join(root, 'public', ...url.split('/').filter(Boolean), 'index.html');
      if (!existsSync(page)) {
        throw new Error(`${relative(page)} was not built — the entry is still being excluded`);
      }
      say(`  ${green('✓')} ${dim(`${relative(page)} is there`)}`);
      say();
      await preview(url);
    },
  },

  {
    name: 'commit',
    doing: 'Committing the entry',
    does: 'Commits the entry folder together with any part pages it created.',
    you: 'You check the file list and say yes, or say no and commit it yourself.',
    done: (entry) => git('status', '--porcelain', '--', entry.dir).trim() === '',
    summary: () => 'committed',
    async run(entry) {
      // Last gate on the title: the one set at scaffold time was only a guess
      // from the slug, and renaming an entry on the way here is the norm.
      const issues = titleIssues(entry.doc.title);
      if (issues.length) {
        throw new Error(`title "${entry.doc.title}": ${issues.join('; ')}`);
      }

      const parts = git('status', '--porcelain', '--', path.join(root, 'content', 'parts'))
        .split('\n')
        .filter(Boolean)
        .map((line) => line.slice(3));
      const paths = [relative(entry.dir), ...parts];

      say(dim('  This is what would go in:'));
      for (const file of paths) say(`    ${green(file)}`);
      say();
      if (!(await confirm(`  Commit as “Add entry "${entry.doc.title}"”?`))) {
        say(dim('  left uncommitted'));
        return;
      }

      git('add', '--', ...paths);
      git('commit', '-m', `Add entry "${entry.doc.title}"`);
    },
  },
];

/* --------------------------------------------------------------- state -- */

// Every stage answers to the first letter of its name — except scaffold: the
// s belongs to sources, and scaffold is the tab that runs itself off the menu
// pick and is closed for good after.
const shortcut = (stage) => (stage.name === 'scaffold' ? '' : stage.name[0]);

const isDone = (entry, stage) => entry.done.has(stage.name);
const allDone = (entry) => STAGES.every((stage) => isDone(entry, stage));
const nextStage = (entry) => STAGES.find((stage) => !isDone(entry, stage));
const spent = (entry, stage) => Boolean(stage.once) && isDone(entry, stage);

// After a stage runs the cursor moves on from *that* stage rather than
// snapping back to the first unfinished one — so jumping ahead to commit and
// running it doesn't throw you backwards. A stage that didn't finish keeps
// the cursor, since pressing enter again is the whole answer.
function advance(entry, from) {
  for (let step = 0; step < STAGES.length; step += 1) {
    const at = (from + step) % STAGES.length;
    if (!isDone(entry, STAGES[at])) return at;
  }
  return from;
}

// The whole of what the board knows about the entry, read once per load: the
// seven detections cost a git status and a model parse between them, and the
// tab bar is repainted on every keystroke.
function load(id) {
  if (id === undefined) {
    return { id: undefined, number: highestId() + 1, title: '', done: new Set() };
  }

  const found = entryFile(id);
  const entry = {
    ...found,
    number: Number(found.id),
    doc: entryEditor(found.file),
    model: existsSync(found.dir) ? modelFile(found.dir) : undefined,
    image: path.join(found.dir, 'image.png'),
  };

  // A model whose header is stale is normalized in passing; one whose name is
  // wrong needs a rename we are not allowed to make on our own, so it is
  // handed to the runner to ask about under the board.
  if (entry.model) {
    try {
      normalizeEntry(id);
    } catch (error) {
      if (!(error instanceof RenameToMpd)) throw error;
      entry.rename = error;
    }
    entry.model = modelFile(entry.dir);
  }

  entry.title = entry.doc.exists ? entry.doc.title : '';
  // Nothing is done before the folder exists — scaffold's own test is that
  // the entry has an index.md, so this covers every stage at once.
  entry.done = new Set(
    STAGES.filter((stage) => entry.doc.exists && stage.done(entry)).map((stage) => stage.name)
  );
  return entry;
}

/* --------------------------------------------------------------- board -- */

// A note is a whole line and only ever one: an error message long enough to
// wrap would push the board down and smear the in-place redraw.
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function status({ entry, note, running, asking }) {
  if (running) return boldBlue(`${running.doing}…`);
  if (asking) return `${yellow('!')} ${yellow('One thing to answer before we continue.')}`;
  if (note) {
    const mark = note.kind === 'done' ? green('✓') : note.kind === 'warn' ? yellow('!') : red('⨯');
    const paint = note.kind === 'done' ? dim : note.kind === 'warn' ? yellow : red;
    return `${mark} ${paint(clip(note.text, COLUMNS() - 4))}`;
  }
  if (allDone(entry)) return boldGreen('All seven stages are done.');
  if (!entry.done.size) return yellow('Complete scaffolding to create the entry files.');
  return dim(`Picked up where you left off — ${nextStage(entry).name} is next.`);
}

// Three colours and no more: green a stage that is done, blue the one you are
// on, grey one still to do. The bar and the line under it are built off one
// set of cells, so a tab and its underline always agree on colour and span.
const BLUE = '1;94';
const paint = (codes, text) => (text ? sgr(codes)(text) : '');

// The name with its shortcut letter underlined — three segments rather than
// one, because an underline nested inside a colour ends the colour with it.
const tabLabel = (stage, codes, lead) =>
  shortcut(stage)
    ? paint(codes, lead) + paint(`${codes};4`, stage.name[0]) + paint(codes, stage.name.slice(1))
    : paint(codes, lead + stage.name);

function tabBar(entry, at) {
  const cells = STAGES.map((stage, i) => {
    const codes = i === at ? BLUE : isDone(entry, stage) ? '32' : '2';
    const lead = isDone(entry, stage) ? '✓ ' : i === at ? '❯ ' : '  ';
    return { codes, span: lead.length + stage.name.length, text: tabLabel(stage, codes, lead) };
  });
  return [
    `  ${cells.map((cell) => cell.text).join('  ')}`,
    `  ${cells
      .map((cell) => paint(cell.codes, (cell.codes === BLUE ? '━' : '─').repeat(cell.span)))
      .join(dim('──'))}`,
  ];
}

function panel(entry, stage) {
  const lines = wrap(stage.does, COLUMNS() - 4).map((line) => `  ${line}`);
  lines.push('');
  if (isDone(entry, stage)) {
    const again = stage.once
      ? 'It only runs once, so this tab is closed.'
      : 'Running it again is fine — it works out what is already there.';
    lines.push(
      ...wrap(`Done — ${stage.summary(entry)}. ${again}`, COLUMNS() - 4).map((l) => `  ${dim(l)}`)
    );
  } else {
    lines.push(...wrap(stage.you, COLUMNS() - 4).map((line) => `  ${yellow(line)}`));
  }
  return lines;
}

// The rename question is not a stage, so while it is up the board stops offering one
function askPanel({ file, target }) {
  return [
    ...wrap(
      `${relative(file)} uses the multi-file MPD format, so it has to be named ${path.basename(target)}. Close all programs using it.`,
      COLUMNS() - 4
    ).map((line) => `  ${yellow(line)}`),
    '',
    `  ${dim('y renames it and the board comes back  ·  n stops the run')}`,
  ];
}

function board(view) {
  const { entry, running, asking } = view;
  const at = running ? STAGES.indexOf(running) : asking ? -1 : view.at;
  const done = entry.done.size;
  return [
    `${dim('entry')} ${bold(String(entry.number))} ${dim('·')} ${
      entry.title ? boldWhite(entry.title) : dim('a new entry, not named yet')
    } ${dim(`· ${done} of ${STAGES.length} done`)}`,
    '',
    `  ${status(view)}`,
    '',
    ...tabBar(entry, at),
    '',
    ...(running ? [] : asking ? [...askPanel(asking), ''] : [...panel(entry, STAGES[at]), '']),
  ];
}

// A tab you cannot run says so before you press enter, not after.
const hint = (entry, stage) =>
  spent(entry, stage)
    ? `${stage.name} has already run, and only runs once  ·  ◀ ▶ to switch  ·  q quit`
    : `enter runs ${stage.name}  ·  ◀ ▶ or its letter to switch  ·  q quit`;

async function step(view) {
  const { entry } = view;
  let warn = '';
  const draw = block();
  const render = () =>
    draw([...board(view), `  ${warn ? red(warn) : dim(hint(entry, STAGES[view.at]))}`]);

  reading(true);
  try {
    render();
    for (;;) {
      const key = await readKey();
      warn = '';
      if (key === LEFT || key === UP) view.at = (view.at + STAGES.length - 1) % STAGES.length;
      else if (key === RIGHT || key === DOWN) view.at = (view.at + 1) % STAGES.length;
      else if (ENTER.includes(key)) {
        if (!spent(entry, STAGES[view.at])) return STAGES[view.at];
        warn = `${STAGES[view.at].name} has already run, and it only runs once — pick another stage.`;
      } else if (key.toLowerCase() === 'q' || key === ESC) return undefined;
      else {
        // Its own letter jumps to a tab; enter is still the only thing that
        // runs one.
        const jump = STAGES.findIndex((stage) => shortcut(stage) === key.toLowerCase());
        if (jump >= 0) view.at = jump;
      }
      render();
    }
  } finally {
    reading(false);
  }
}

/* -------------------------------------------------------------- runner -- */

// Four ways for a stage to end, and only one of them is worth keeping the
// screen for: a failure's own output is the explanation, and the note under
// the board can only point at it.
async function runStage(entry, stage) {
  try {
    return { id: await stage.run(entry) };
  } catch (error) {
    if (error instanceof Abort) {
      // Aborting the stage that mints the entry aborts the lot: there is no
      // half-made entry to come back to, and nothing was written.
      if (stage.once && !isDone(entry, stage)) {
        clear();
        say();
        say(`  ${red('⨯')} ${red('Aborted before the entry was created.')} ${dim('Nothing was written.')}`);
        say();
        bye(1);
      }
      return { note: { kind: 'abort', text: `${stage.name} aborted` } };
    }
    if (error.code === 'ENOENT' || !(error instanceof Error)) throw error;
    const text =
      error.status == null
        ? `${stage.name} failed — ${error.message}`
        : `${stage.name} failed — ${error.command ?? 'a command'} exited ${error.status}, its output is above`;
    return { note: { kind: 'fail', text } };
  }
}

const finished = (entry, stage) =>
  isDone(entry, stage)
    ? { kind: 'done', text: `${stage.name} done — ${stage.summary(entry)}` }
    : { kind: 'warn', text: `${stage.name} didn't finish — its tab is still open` };

function farewell(view) {
  if (view.note?.kind !== 'fail') clear();
  for (const line of board(view)) say(line);
  if (allDone(view.entry)) {
    say(dim('  Still yours to do by hand: the size, and the tags (including partcount-).'));
  }
  say(dim(`  Pick up any time with \`npm run entry ${view.entry.number}\`.`));
  say();
}

// An id runs the board over an entry that exists; no id means npm run new
// just picked "entry", and picking it was the answer to "shall I scaffold?" —
// so scaffold starts under the board without asking again.
export async function runStages(id) {
  const view = { entry: load(id), at: 0, note: undefined, running: undefined };
  // An entry with nothing left to do opens on the last stage, not the first:
  // scaffold is closed, and commit is what you would want to run again.
  view.at = STAGES.indexOf(nextStage(view.entry) ?? STAGES.at(-1));
  let straightIn = id === undefined;

  for (;;) {
    if (view.note?.kind !== 'fail') clear();

    if (view.entry.rename) {
      view.asking = view.entry.rename;
      for (const line of board(view)) say(line);
      const { file, target } = view.entry.rename;
      const prompt = `  ${yellow('❯')} ${boldWhite(`Rename it to ${path.basename(target)}?`)}`;
      if (!(await confirm(prompt).catch(() => false))) {
        throw view.entry.rename;
      }
      renameSync(file, target);
      view.asking = undefined;
      view.entry = load(view.entry.id);
      continue;
    }

    let stage;
    if (straightIn) {
      straightIn = false;
      stage = STAGES[0];
    } else {
      stage = await step(view);
      if (!stage) return farewell(view);
      clear();
    }

    view.running = stage;
    view.note = undefined;
    for (const line of board(view)) say(line);
    say();

    const outcome = await runStage(view.entry, stage);
    view.running = undefined;
    view.entry = load(outcome.id ?? view.entry.id);
    view.note = outcome.note ?? finished(view.entry, stage);
    view.at = advance(view.entry, STAGES.indexOf(stage));

    // Finishing the last open stage ends the run; an entry that was already
    // finished when you arrived does not, since re-running one is why you
    // would have opened it.
    if (allDone(view.entry)) return farewell(view);
  }
}

if (process.argv[1] === import.meta.filename) {
  const [id = String(highestId()), ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error(`unexpected argument ${extra[0]} — usage: entry [id]`);
  if (!isEntryId(id)) throw new Error(`${id} is not an entry number`);

  try {
    await runStages(id);
  } catch (error) {
    say(`${red('error')}: ${error.message}`);
    process.exitCode = 1;
  }
  bye(process.exitCode ?? 0);
}
