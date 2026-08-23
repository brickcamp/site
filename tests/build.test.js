// The seams between the build and the client, checked against a real public/.
//
// Every other test file runs on fixtures; this one runs the client modules
// against the files Hugo wrote, so the string conventions AGENTS.md lists as
// invisible couplings have somewhere to fail. It needs a build and skips
// without one — and it judges whatever public/ currently holds, so build
// before trusting it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as scope from "../assets/js/home/scope.js";
import * as lookup from "../assets/js/home/lookup.js";
import { fetchFromDir } from "./helpers/fetch.js";

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const built = existsSync(path.join(PUBLIC, "data", "scopes", "index.json"));
const skip = built ? false : "no build in public/ — run `hugo` first";

const ANY = scope.ANY;
const state = (patch) => ({
  base: ANY, type: ANY, value: ANY, part: ANY, size: ANY,
  sort: scope.sortDefault(), query: "", ...patch,
});

const serve = fetchFromDir(PUBLIC);

async function loadCatalog() {
  scope.init(await (await serve("/data/scopes/index.json")).json());
  lookup.useFetch(serve);
}

test("the published catalog is the shape scope.js reads", { skip }, async () => {
  await loadCatalog();

  const catalog = await (await serve("/data/scopes/index.json")).json();
  assert.ok(catalog.scopes.some((s) => s.slug === ANY), "no __any scope to open on");
  assert.ok(catalog.dimensions.sort.default, "no default sort");

  const sorts = catalog.dimensions.sort.options.map((o) => o.slug);
  assert.ok(sorts.includes(catalog.dimensions.sort.default), "default sort is not an option");

  for (const s of catalog.scopes) {
    assert.ok(Array.isArray(s.types), `scope ${s.slug}: no types`);
    assert.ok(Array.isArray(s.values), `scope ${s.slug}: no values`);
  }
});

test("every sort option but random has a published order file", { skip }, async () => {
  await loadCatalog();
  const catalog = await (await serve("/data/scopes/index.json")).json();

  for (const option of catalog.dimensions.sort.options) {
    if (option.slug === "random") continue; // shuffles the title order instead
    const res = await serve(`/data/sorted/${option.slug}/index.csv`);
    assert.ok(res.ok, `sort ${option.slug}: no /data/sorted/${option.slug}/index.csv`);
  }
});

test("the unfiltered lookup yields entries with every column filled", { skip }, async () => {
  await loadCatalog();
  const entries = await lookup.scopedEntries(state());

  assert.ok(entries.length > 0, "the unfiltered scope found no entries");
  for (const entry of entries) {
    assert.match(entry.link, /^\/.*\/$/, `bad link: ${entry.link}`);
    assert.ok(entry.title, `entry ${entry.link} has no title`);
    assert.ok(entry.size, `entry ${entry.link} has no size`);
  }
});

test("every scoped type resolves to a lookup file or to nothing at all", { skip }, async () => {
  await loadCatalog();
  const catalog = await (await serve("/data/scopes/index.json")).json();

  for (const s of catalog.scopes) {
    if (s.slug === ANY || s.from !== "tags") continue;

    // Hugo publishes no file for a CSV that renders empty, so an absent file is
    // legal — a broken path convention is not, and shows up as every type of a
    // scope coming back empty while the scope itself has entries.
    const inScope = await lookup.scopedEntries(state({ base: s.slug }));
    if (inScope.length === 0) continue;

    const perType = await Promise.all(
      s.types.map((t) => lookup.scopedEntries(state({ base: s.slug, type: t.slug }))),
    );
    assert.ok(
      s.types.length === 0 || perType.some((entries) => entries.length > 0),
      `scope ${s.slug}: has entries, but no type does — check the lookup path convention`,
    );
  }
});

test("a scoped entry's values are the ones the value filter matches on", { skip }, async () => {
  await loadCatalog();
  const catalog = await (await serve("/data/scopes/index.json")).json();

  for (const s of catalog.scopes) {
    if (s.slug === ANY || s.from !== "tags" || s.values.length === 0) continue;

    const entries = await lookup.scopedEntries(state({ base: s.slug }));
    const carried = new Set(entries.flatMap((e) => e.values));
    if (carried.size === 0) continue;

    for (const value of carried) {
      const matched = await lookup.scopedEntries(state({ base: s.slug, value: value }));
      assert.ok(matched.length > 0, `scope ${s.slug}: value ${value} is carried but matches nothing`);
    }
  }
});

test("the part list parses, and a listed part leads to entries", { skip }, async () => {
  await loadCatalog();
  const catalog = await (await serve("/data/scopes/index.json")).json();
  const partScope = catalog.scopes.find((s) => s.from === "parts");
  assert.ok(partScope, "no scope reads from parts");

  const parts = await lookup.scopedParts(state({ base: partScope.slug }));
  assert.ok(parts.length > 0, "the part list is empty");
  for (const part of parts) {
    assert.ok(part.id, "a part row has no id");
    assert.ok(part.title, `part ${part.id} has no title`);
  }

  const entries = await lookup.scopedEntries(state({ base: partScope.slug, part: parts[0].id }));
  assert.ok(entries.length > 0, `part ${parts[0].id} is listed but has no entries`);
});
