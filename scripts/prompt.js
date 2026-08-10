// The terminal questions the interactive scripts share.
//
// The readline is opened on first use and closed by the caller, because the
// two callers want opposite lifetimes: new.js closes the TTY before it does
// any work, while the stage runner keeps asking between GUI launches and
// network calls. Closing it any other way — Ctrl-C, Ctrl-D — is an abort.

import { createInterface } from 'node:readline/promises';

let rl;
let closing = false;

function readline() {
  if (!rl) {
    rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.on('SIGINT', () => process.exit(130));
    rl.on('close', () => {
      if (!closing) process.exit(1);
    });
  }
  return rl;
}

export function closePrompt() {
  closing = true;
  rl?.close();
}

// prefill lands in the input buffer, so the answer is editable rather than
// retyped — how a derived list is offered for correction.
async function read(text, prefill) {
  const answer = readline().question(text);
  if (prefill) rl.write(prefill);
  return (await answer).trim();
}

// One question, asked once, whatever comes back. For anything with a fixed
// set of answers, use ask or confirm instead.
export const question = (prompt, prefill) => read(`${prompt}: `, prefill);

// Re-asks until the answer (or the default, on empty input) is valid.
export async function ask(prompt, fallback, valid, hint) {
  for (;;) {
    const suffix = fallback === undefined ? '' : ` [${fallback}]`;
    const answer = (await read(`${prompt}${suffix}: `)) || fallback || '';
    if (valid(answer)) return answer;
    console.log(`  (${hint})`);
  }
}

export const isYes = (answer) => /^y(es)?$/i.test(answer);
export const isNo = (answer) => /^no?$/i.test(answer);

export async function confirm(prompt, fallback = true) {
  for (;;) {
    const answer = await read(`${prompt} [${fallback ? 'Y/n' : 'y/N'}]: `);
    if (!answer) return fallback;
    if (isYes(answer)) return true;
    if (isNo(answer)) return false;
    console.log('  (answer y or n)');
  }
}
