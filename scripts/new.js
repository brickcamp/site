#!/usr/bin/env node
// The one command behind npm run new: asks what to add — an entry, a link,
// a link image or a part — and for the details, then does it. A new entry
// carries straight on into the stage runner that walks it to a commit.

import { createEntry, highestId, isEntryId, isSlug } from './entry.js';
import { addLink, addLinkImage } from './link.js';
import { createPart } from './part.js';
import { ask, closePrompt } from './prompt.js';
import { runStages } from './stages.js';

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
  run = () => runStages(createEntry(slug));
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

try {
  await run();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
} finally {
  closePrompt();
}
