#!/usr/bin/env node
// The one command behind npm run new: asks what to add — an entry, a link,
// a link image or a part — and for the details, then does it.

import { createInterface } from 'node:readline/promises';
import { createEntry, highestId, isEntryId, isSlug } from './entry.js';
import { addLink, addLinkImage } from './link.js';
import { createPart } from './part.js';

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on('SIGINT', () => process.exit(130));
let asking = true;
rl.on('close', () => {
  if (asking) process.exit(1);
});

// Re-asks until the answer (or the default, on empty input) is valid.
async function ask(prompt, fallback, valid, hint) {
  for (;;) {
    const suffix = fallback === undefined ? '' : ` [${fallback}]`;
    const answer = (await rl.question(`${prompt}${suffix}: `)).trim() || fallback || '';
    if (valid(answer)) return answer;
    console.log(`  (${hint})`);
  }
}

const KINDS = {
  e: 'entry', entry: 'entry',
  l: 'link', link: 'link',
  i: 'link image', image: 'link image', 'link image': 'link image',
  p: 'part', part: 'part',
};
const kind = KINDS[
  (await ask('add entry, link, link image or part (e/l/i/p)', 
             'entry',
             (answer) => answer.toLowerCase() in KINDS, 
             'answer entry, link, link image or part')
  ).toLowerCase()
];

let run;
if (kind === 'entry') {
  const slug = await ask('url slug', undefined, isSlug, 'lowercase, digits, dashes');
  run = () => createEntry(slug);
} else if (kind === 'part') {
  const numbers = (
    await ask('part number(s)', undefined, (answer) => answer !== '', 'one or more, space-separated')
  ).split(/\s+/);
  run = async () => {
    for (const number of numbers) {
      await createPart(number).catch((error) => {
        console.error(`error: ${error.message}`);
        process.exitCode = 1;
      });
    }
  };
} else {
  const id = await ask('entry number', String(highestId()), isEntryId, 'an entry number, digits only');
  const url = await ask(kind === 'link' ? 'url' : 'image url', undefined,
    (answer) => URL.canParse(answer), 'a full url, including https://');
  run = () => (kind === 'link' ? addLink(id, url) : addLinkImage(id, url));
}

asking = false;
rl.close();
try {
  await run();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
