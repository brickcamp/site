// What every script shares: the repo root, .env key lookup, and a fetch
// with a browser user-agent and a timeout.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0';

export const get = (url, options = {}) =>
  fetch(url, {
    signal: AbortSignal.timeout(30_000),
    ...options,
    headers: { 'user-agent': UA, ...options.headers },
  });

// TOML literal strings cannot contain single quotes; fall back to a basic string.
export const tomlQuote = (value) =>
  value.includes("'")
    ? `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
    : `'${value}'`;

let env;
export function envKey(name) {
  if (process.env[name]) return process.env[name];
  try {
    env ??= readFileSync(path.join(root, '.env'), 'utf8');
  } catch {
    env = '';
  }
  return env.match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1]?.trim();
}
