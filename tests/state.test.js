// The rules that span dimensions: what a patch drags with it, and what
// normalize() clears when the scope cannot support it.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as scope from "../assets/js/home/scope.js";
import * as state from "../assets/js/home/state.js";
import { catalog } from "./helpers/catalog.js";
import { installBrowser } from "./helpers/browser.js";

const ANY = scope.ANY;

const at = (patch) => state.normalize({ ...patch });

test.beforeEach(() => {
  scope.init(catalog);
  installBrowser();
});

test("defaults open on everything, sorted by the catalog's default", () => {
  const s = at({});
  assert.deepEqual(s, {
    base: ANY, type: ANY, value: ANY, part: ANY, partgroup: ANY, size: ANY,
    sort: "date-desc", query: "", queryPending: false,
  });
});

test("picking a group drops the part; picking a part keeps the group", () => {
  const inPart = at({ base: "part", partgroup: "bricks", part: "3001" });

  const upToGroup = state.next(inPart, { partgroup: "plates" });
  assert.equal(upToGroup.part, ANY);

  const downToPart = state.next(upToGroup, { part: "3023" });
  assert.equal(downToPart.partgroup, "plates");
});

test("switching base drops what only the old base could mean", () => {
  const before = at({ base: "shape", type: "polygon", value: "6" });
  const after = state.next(before, { base: "repeat" });
  assert.equal(after.type, ANY);
  assert.equal(after.value, ANY);
  assert.equal(after.part, ANY);
});

test("switching base keeps size, sort and query — they mean the same everywhere", () => {
  const before = at({ base: "shape", size: "l", sort: "title-asc", query: "hinge" });
  const after = state.next(before, { base: "repeat" });
  assert.equal(after.size, "l");
  assert.equal(after.sort, "title-asc");
  assert.equal(after.query, "hinge");
});

test("the query clears whenever the search switches between parts and entries", () => {
  const entries = at({ base: "shape", query: "hinge" });

  // …opening the part list, where the box searches parts
  assert.equal(state.next(entries, { base: "part" }).query, "");

  // …and picking a part, where it searches entries again
  const list = at({ base: "part", query: "plate" });
  assert.equal(state.next(list, { part: "3001" }).query, "");
});

test("a base that is not the part list leaves the query alone", () => {
  const before = at({ base: "shape", query: "hinge" });
  assert.equal(state.next(before, { base: "repeat" }).query, "hinge");
});

test("normalize folds the query the way a search should compare", () => {
  assert.equal(at({ query: "  Jagged   Wall " }).query, "jagged wall");
});

test("normalize clears a dimension the scope cannot support", () => {
  assert.equal(at({ base: "repeat", type: "linear", value: "6" }).value, ANY);
  assert.equal(at({ base: "__any", type: "polygon" }).type, ANY);
});

test("an unlisted type survives normalize — nothing checks it against the scope", () => {
  // Documented as found, not as wanted: normalize only asks whether the scope
  // has a type dimension at all, never whether this type is one it lists. A
  // hand-edited ?type= reaches lookup.js, 404s, and shows an empty result under
  // its own slug as a label. The build side is stricter — tags/getSegments
  // fails on an unlisted type.
  const s = at({ base: "shape", type: "nonesuch", value: "6" });
  assert.equal(s.type, "nonesuch");
  assert.equal(s.value, "6");
});

test("an empty type is normalized away, and the value it gated comes back", () => {
  const s = at({ base: "shape", type: "", value: "6" });
  assert.equal(s.type, ANY);
  assert.equal(s.value, "6");
});

test("the part list has no size or sort to keep", () => {
  const s = at({ base: "part", size: "l", sort: "title-asc" });
  assert.equal(s.size, ANY);
  assert.equal(s.sort, "date-desc");
});

test("save() writes the non-default state to the URL and load() reads it back", () => {
  const calls = installBrowser();
  const saved = state.save(at({ base: "shape", type: "polygon", query: "wall" }));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].kind, "push");
  assert.deepEqual(state.load(), saved);
});

test("a pending query replaces rather than pushes, so typing leaves no history", () => {
  const calls = installBrowser();
  state.save(at({ query: "wal", queryPending: true }));
  assert.equal(calls[0].kind, "replace");
});
