// Finds the GUI applications for the entry flow drives (LeoCAD, LDView).
//
// Always hand these absolute paths. flatpak-spawn runs the child with the
// host's working directory and a sandboxed app resolves paths in its own
// namespace, so a relative path is right in neither.

import { spawn } from 'node:child_process';
import { accessSync, constants, existsSync } from 'node:fs';
import path from 'node:path';
import { envKey } from './shared.js';

const APPS = {
  leocad: { override: 'LEOCAD_BIN', binaries: ['leocad', 'LeoCAD'], flatpak: 'org.leocad.LeoCAD' },
  ldview: { override: 'LDVIEW_BIN', binaries: ['ldview', 'LDView'], flatpak: 'io.github.tcobbs.LDView' },
};

const onPath = (binary) =>
  (process.env.PATH ?? '').split(path.delimiter).some((dir) => {
    try {
      accessSync(path.join(dir, binary), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });

// A native install always wins, so a Debian package is used as-is and never
// shadowed by a flatpak; the spawn hop is only for scripts running inside a
// sandbox of their own, which is where npm runs on the Steam Deck.
export function resolveApp(name) {
  const app = APPS[name];
  const override = envKey(app.override);
  if (override) return { command: override, args: [] };

  const binary = app.binaries.find(onPath);
  if (binary) return { command: binary, args: [] };

  if (onPath('flatpak')) return { command: 'flatpak', args: ['run', app.flatpak] };
  if (existsSync('/.flatpak-info')) {
    return { command: 'flatpak-spawn', args: ['--host', 'flatpak', 'run', app.flatpak] };
  }

  throw new Error(
    `${name} not found — looked for ${app.binaries.join('/')} on PATH and the ` +
      `${app.flatpak} flatpak; set ${app.override} in .env to point at it`
  );
}

// detach for long-time sessions in these apps beyond the script's runtime.
const detach = (command, args) => {
  spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
};

export function launch(name, args) {
  const app = resolveApp(name);
  detach(app.command, [...app.args, ...args]);
}

// Open a URL or file in the default desktop application
export function open(target) {
  const [command, ...args] = onPath('xdg-open')
    ? ['xdg-open']
    : ['flatpak-spawn', '--host', 'xdg-open'];
  detach(command, [...args, target]);
}
