// The terminal the interactive scripts are drawn on: colours, a screen the
// board can be redrawn into, and the questions asked underneath it.
//
// A TTY is assumed — every caller is a human at a keyboard — and raw mode is
// held only while something here is actually reading, so a stage that hands
// the terminal to LeoCAD, hugo or a browser hands it over in cooked mode.

/* ------------------------------------------------------------- painting -- */

const colour = !process.env.NO_COLOR;
export const sgr = (codes) => (text) => (colour ? `\x1b[${codes}m${text}\x1b[0m` : text);

export const bold = sgr('1');
export const dim = sgr('2');
const under = sgr('4');
export const red = sgr('31');
export const green = sgr('32');
export const yellow = sgr('33');
export const boldGreen = sgr('1;32');
export const boldBlue = sgr('1;94');
export const boldWhite = sgr('1;97');

const strip = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');
export const width = (text) => strip(text).length;
const pad = (text, n) => text + ' '.repeat(Math.max(0, n - width(text)));

export const COLUMNS = () => Math.min(process.stdout.columns || 80, 84);

// Raw mode means a bare \n moves down without returning the carriage, so all
// output goes through say() rather than console.log.
export const say = (text = '') => process.stdout.write(`${text}\r\n`);

// The scrollback is deliberately left alone (no \x1b[3J): the board goes back
// to the top of the screen, but a hugo build error that scrolled past is
// still there to scroll back to.
export const clear = () => process.stdout.write('\x1b[2J\x1b[H');

export function wrap(text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && width(line) + 1 + width(word) > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

// Redraws a block of lines in place: every call first moves back up over the
// last one, padding out to its height so a shorter block wipes what it left.
// Leaves the cursor below the block, so ordinary output carries on after.
export function block() {
  let drawn = 0;
  return (lines) => {
    if (drawn) process.stdout.write(`\x1b[${drawn}A`);
    const padded = [...lines, ...Array(Math.max(0, drawn - lines.length)).fill('')];
    process.stdout.write(`${padded.map((line) => `\r\x1b[2K${line}`).join('\r\n')}\r\n`);
    drawn = padded.length;
  };
}

/* ----------------------------------------------------------------- keys -- */

const CTRL_C = '\x03';
const CTRL_D = '\x04';
export const ESC = '\x1b';
const HOME = ['\x1b[H', '\x1b[1~', '\x01'];
const END = ['\x1b[F', '\x1b[4~', '\x05'];
export const UP = '\x1b[A';
export const DOWN = '\x1b[B';
export const RIGHT = '\x1b[C';
export const LEFT = '\x1b[D';
export const ENTER = ['\r', '\n'];

const queue = [];
const waiting = [];

export function bye(code) {
  reading(false);
  process.exit(code);
}

process.on('exit', () => reading(false));

// An escape sequence arrives glued to whatever followed it, so split first:
// one read should be one key.
function split(chunk) {
  const keys = [];
  for (let i = 0; i < chunk.length; ) {
    const escape = chunk[i] === ESC && /^\x1b\[[0-9;]*[A-Za-z~]/.exec(chunk.slice(i));
    keys.push(escape ? escape[0] : chunk[i]);
    i += escape ? escape[0].length : 1;
  }
  return keys;
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  for (const key of split(chunk)) {
    if (key === CTRL_C) bye(130);
    if (waiting.length) waiting.shift()(key);
    else queue.push(key);
  }
});

// On for a question or a board, off for everything else. Anything that reads
// keys directly owns a matching pair, and the exit handler above is the
// backstop for a throw that gets past one.
let raw = false;
export function reading(on) {
  if (on === raw || !process.stdin.isTTY) return;
  raw = on;
  process.stdout.write(on ? '\x1b[?25l' : '\x1b[?25h');
  process.stdin.setRawMode(on);
  if (on) process.stdin.resume();
  else process.stdin.pause();
}

export const readKey = () =>
  queue.length ? Promise.resolve(queue.shift()) : new Promise((take) => waiting.push(take));

/* --------------------------------------------------------------- asking -- */

// Esc anywhere a question is being asked drops the stage and goes back to the
// board — the one way out that isn't Ctrl-C killing the whole run.
export class Abort extends Error {}

// A line editor, because readline cannot share the terminal with raw-mode
// arrow keys — and because owning it is what buys both the live preview under
// the slug question and the filter that shapes a slug as you type it.
async function readLine({ prompt, prefill = '', preview, filter }) {
  let text = prefill;
  let at = text.length;

  const draw = () => {
    let out = `\r\x1b[2K${prompt}${text}`;
    if (preview) out += `\r\n\x1b[2K${preview(text)}\x1b[1A`;
    process.stdout.write(`${out}\x1b[${width(prompt) + at + 1}G`);
  };

  reading(true);
  process.stdout.write('\x1b[?25h');
  try {
    draw();
    for (;;) {
      const key = await readKey();
      if (ENTER.includes(key)) break;
      else if (key === ESC) throw new Abort();
      else if (key === CTRL_D) throw new Abort();
      else if (key === '\x7f' || key === '\b') {
        if (at > 0) {
          text = text.slice(0, at - 1) + text.slice(at);
          at -= 1;
        }
      } else if (key === '\x1b[3~') text = text.slice(0, at) + text.slice(at + 1);
      else if (key === LEFT) at = Math.max(0, at - 1);
      else if (key === RIGHT) at = Math.min(text.length, at + 1);
      else if (HOME.includes(key)) at = 0;
      else if (END.includes(key)) at = text.length;
      else if (key === '\x15') {
        text = text.slice(at);
        at = 0;
      } else if (key.length === 1 && key >= ' ') {
        const typed = filter ? filter(key, text, at) : key;
        if (typed) {
          text = text.slice(0, at) + typed + text.slice(at);
          at += typed.length;
        }
      }
      draw();
    }
    process.stdout.write(preview ? '\r\n\r\n' : '\r\n');
    return text.trim();
  } finally {
    reading(false);
  }
}

// One question, asked once, whatever comes back. For anything with a fixed
// set of answers, use ask or confirm instead.
export const question = ({ prompt, prefill }) =>
  readLine({ prompt: `${prompt}${dim(':')} `, prefill });

// Re-asks until the answer (or the default, on empty input) is valid.
export async function ask({ prompt, fallback, prefill, valid = () => true, hint, preview, filter }) {
  const suffix = fallback ? ` [${bold(fallback)}]` : '';
  for (;;) {
    const typed = await readLine({ prompt: `${prompt}${suffix}${dim(':')} `, prefill, preview, filter });
    const answer = typed || fallback || '';
    if (valid(answer)) return answer;
    say(`  ${yellow('↑')} ${dim(hint)}`);
  }
}

const isYes = (answer) => /^y(es)?$/i.test(answer);
const isNo = (answer) => /^no?$/i.test(answer);

export async function confirm(prompt, fallback = true) {
  const hint = fallback ? `${bold('Y')}${dim('/n')}` : `${dim('y/')}${bold('N')}`;
  for (;;) {
    const answer = await readLine({ prompt: `${prompt} [${hint}]${dim(':')} ` });
    if (!answer) return fallback;
    if (isYes(answer)) return true;
    if (isNo(answer)) return false;
    say(`  ${yellow('↑')} ${dim('y or n')}`);
  }
}

// Arrow-key picker: every option answers to the first letter of its label.
export async function select({ question: heading, options, hint }) {
  say(boldWhite(heading));
  say();
  const draw = block();
  let at = 0;

  const render = () =>
    draw([
      ...options.map((option, i) => {
        const label = under(option.label[0]) + option.label.slice(1);
        const lead = i === at ? `${boldBlue('❯')} ${boldBlue(label)}` : `  ${label}`;
        return `  ${pad(lead, 15)}${dim(option.description)}`;
      }),
      '',
      `  ${dim(hint)}`,
    ]);

  reading(true);
  try {
    render();
    for (;;) {
      const key = await readKey();
      if (key === UP || key === LEFT) at = (at + options.length - 1) % options.length;
      else if (key === DOWN || key === RIGHT) at = (at + 1) % options.length;
      else if (ENTER.includes(key)) break;
      else if (key === ESC) bye(0);
      else {
        const found = options.findIndex((o) => o.label[0].toLowerCase() === key.toLowerCase());
        if (found >= 0) {
          at = found;
          render();
          break;
        }
      }
      render();
    }
  } finally {
    reading(false);
  }
  say();
  return options[at];
}
