#!/usr/bin/env node
// The one command behind npm run new: asks what to add — an entry, a link, an
// image or a part — and for the details, then does it. Picking "entry" is
// itself the answer to "shall I scaffold?", so it goes straight into the
// stage runner, which owns scaffolding and everything after it.

import { highestId, isEntryId } from './entry.js';
import { addLink, addLinkImage } from './link.js';
import { createPart } from './part.js';
import { runStages } from './stages.js';
import { Abort, ask, bye, clear, red, say, select } from './tui.js';

const KINDS = [
  { label: 'Entry', description: 'a technique: model, render, parts, sources, commit' },
  { label: 'Link', description: 'a source url on an entry that already exists' },
  { label: 'Image', description: 'a source url whose preview image you point at' },
  { label: 'Part', description: 'a part page, pulled from Rebrickable' },
];

clear();
say();

// Esc at any of these questions is "never mind", not an error: nothing has
// been written yet, and the stage runner has its own answer to esc.
try {
  await create();
} catch (error) {
  if (error instanceof Abort) bye(0);
  say(`${red('error')}: ${error.message}`);
  process.exitCode = 1;
}
bye(process.exitCode ?? 0);

async function create() {
  const { label } = await select({
    question: 'What would you like to create?',
    options: KINDS,
    hint: '↑↓ to move  ·  enter to choose  ·  or press e, l, i, p',
  });

  if (label === 'Entry') return runStages();

  if (label === 'Part') {
    const numbers = (
      await ask({
        prompt: '  part number(s)',
        valid: (answer) => answer !== '',
        hint: 'one or more, space-separated',
      })
    ).split(/\s+/);
    for (const number of numbers) {
      await createPart(number).catch((error) => {
        say(`${red('error')}: ${error.message}`);
        process.exitCode = 1;
      });
    }
    return undefined;
  }

  const id = await ask({
    prompt: '  entry number',
    fallback: String(highestId()),
    valid: isEntryId,
    hint: 'an entry number, digits only',
  });
  const url = await ask({
    prompt: label === 'Link' ? '  url' : '  image url',
    valid: (answer) => URL.canParse(answer),
    hint: 'a full url, including https://',
  });
  return label === 'Link' ? addLink(id, url) : addLinkImage(id, url);
}
