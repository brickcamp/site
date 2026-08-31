// Which lookup file a state asks for, and what survives the filtering that
// only the client can do.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as scope from "../assets/js/home/scope.js";
import * as lookup from "../assets/js/home/lookup.js";
import { catalog } from "./helpers/catalog.js";
import { fetchFrom, row } from "./helpers/fetch.js";

const ANY = scope.ANY;

const state = (patch) => ({
  base: ANY, type: ANY, value: ANY, part: ANY, partgroup: ANY, size: ANY,
  sort: "date-desc", query: "", ...patch,
});

const SORTED = "/data/sorted/date-desc/index.csv";
const order = (...links) => links.join("\n");

// Two entries, in date order, with the columns getLookupRow.html writes.
const FILES = {
  [SORTED]: order("/entry/b/", "/entry/a/"),
  "/data/filtered/__any-__any-__any/index.csv":
    row("/entry/a/", "Jagged Wall", "s", "") + "\n" +
    row("/entry/b/", "Round Tower", "l", ""),
  "/data/filtered/shape-polygon-__any/index.csv":
    row("/entry/a/", "Jagged Wall", "s", "6|8") + "\n" +
    row("/entry/b/", "Round Tower", "l", "3"),
  "/parts/3001/index.csv": row("/entry/b/", "Round Tower", "l", ""),

  // Two parts in a group and one no group claims, as taxonomy.csv writes them.
  "/parts/index.csv":
    row("3001", "Brick 2 x 4", "bricks") + "\n" +
    row("3002", "Brick 2 x 3", "bricks") + "\n" +
    row("970c28", "Hips and Legs", ""),
  "/partgroups/index.csv": row("bricks", "Bricks", "2", "/parts/3001/__image-min.webp"),
  "/partgroups/bricks/index.csv":
    row("/entry/a/", "Jagged Wall", "s", "") + "\n" +
    row("/entry/b/", "Round Tower", "l", ""),
};

const use = (files = FILES) => lookup.useFetch(fetchFrom(files));

test.beforeEach(() => {
  scope.init(catalog);
  use();
});

test("the unfiltered scope reads the __any file, in the sort order's order", async () => {
  const entries = await lookup.scopedEntries(state());
  assert.deepEqual(entries.map((e) => e.link), ["/entry/b/", "/entry/a/"]);
});

test("a row becomes an entry with the image path derived from its link", async () => {
  const [first] = await lookup.scopedEntries(state({ sort: "date-desc" }));
  assert.deepEqual(first, {
    link: "/entry/b/",
    image: "/entry/b/__image-min.webp",
    title: "Round Tower",
    size: "l",
    values: [],
  });
});

test("base and type pick the file; the value is filtered here, not fetched", async () => {
  const all = await lookup.scopedEntries(state({ base: "shape", type: "polygon" }));
  assert.deepEqual(all.map((e) => e.link), ["/entry/b/", "/entry/a/"]);

  const six = await lookup.scopedEntries(state({ base: "shape", type: "polygon", value: "6" }));
  assert.deepEqual(six.map((e) => e.link), ["/entry/a/"]);
});

test("a picked part reads the part's own file instead of a filtered one", async () => {
  const entries = await lookup.scopedEntries(state({ base: "part", part: "3001" }));
  assert.deepEqual(entries.map((e) => e.link), ["/entry/b/"]);
});

test("a file Hugo never published reads as no rows, not as an error", async () => {
  const entries = await lookup.scopedEntries(state({ base: "shape", type: "circle" }));
  assert.deepEqual(entries, []);
});

test("the size filter runs on the size column", async () => {
  const small = await lookup.scopedEntries(state({ size: "s" }));
  assert.deepEqual(small.map((e) => e.title), ["Jagged Wall"]);
});

test("search matches titles, case-insensitively", async () => {
  const found = await lookup.scopedEntries(state({ query: "wall" }));
  assert.deepEqual(found.map((e) => e.title), ["Jagged Wall"]);
});

test("an entry the sort order omits drops out of the result", async () => {
  use({ ...FILES, [SORTED]: order("/entry/a/") });
  const entries = await lookup.scopedEntries(state());
  assert.deepEqual(entries.map((e) => e.link), ["/entry/a/"]);
});

test("random has no file of its own — it shuffles the title order", async () => {
  const files = { ...FILES, "/data/sorted/title-asc/index.csv": order("/entry/a/", "/entry/b/") };
  use(files);
  const entries = await lookup.scopedEntries(state({ sort: "random" }));
  assert.deepEqual(entries.map((e) => e.link).sort(), ["/entry/a/", "/entry/b/"]);
});

test("the part list opens on groups and no entries", async () => {
  const listState = state({ base: "part" });
  assert.deepEqual(await lookup.scopedEntries(listState), []);

  // The group first by title, then the part no group claims — a part in a
  // group is not a card of its own here.
  const parts = await lookup.scopedParts(listState);
  assert.deepEqual(parts.map((p) => p.id), ["bricks", "970c28"]);
  assert.deepEqual(parts.map((p) => p.dim), ["partgroup", "part"]);
  assert.equal(parts[0].note, "2 parts");
  assert.equal(parts[0].image, "/parts/3001/__image-min.webp");
});

test("a group stands in for its members in a search, and only for its own", async () => {
  const found = await lookup.scopedParts(state({ base: "part", query: "brick" }));
  assert.deepEqual(found.map((p) => p.id), ["bricks"]);

  // A part whose group does not match is listed itself.
  const loose = await lookup.scopedParts(state({ base: "part", query: "hips" }));
  assert.deepEqual(loose.map((p) => p.id), ["970c28"]);
});

test("an open group shows its members and the entries using any of them", async () => {
  const open = state({ base: "part", partgroup: "bricks" });

  const parts = await lookup.scopedParts(open);
  assert.deepEqual(parts.map((p) => p.id), ["3001", "3002"]);

  const entries = await lookup.scopedEntries(open);
  assert.deepEqual(entries.map((e) => e.link), ["/entry/b/", "/entry/a/"]);
});

test("inside a group the search narrows both lists", async () => {
  const open = state({ base: "part", partgroup: "bricks", query: "2 x 4" });
  assert.deepEqual((await lookup.scopedParts(open)).map((p) => p.id), ["3001"]);

  const narrowed = state({ base: "part", partgroup: "bricks", query: "tower" });
  assert.deepEqual((await lookup.scopedEntries(narrowed)).map((e) => e.title), ["Round Tower"]);
});

test("the trail leads back out, and only from somewhere", async () => {
  assert.deepEqual(await lookup.scopedTrail(state({ base: "part" })), []);
  assert.deepEqual(await lookup.scopedTrail(state()), []);

  const inGroup = await lookup.scopedTrail(state({ base: "part", partgroup: "bricks" }));
  assert.deepEqual(inGroup, [
    { title: "All", dim: "partgroup", value: ANY },
    { title: "Bricks", dim: "partgroup", value: "bricks" },
  ]);
});

test("a part's own group leads the trail, whatever the URL says", async () => {
  const trail = await lookup.scopedTrail(
    state({ base: "part", part: "3001", partgroup: "nonesuch" }),
  );
  assert.deepEqual(trail.map((crumb) => crumb.title), ["All", "Bricks", "Brick 2 x 4"]);
});

test("the search box acts on parts only while the part list is open", async () => {
  const listed = await lookup.scopedParts(state({ base: "part", query: "2 x 3" }));
  assert.deepEqual(listed.map((p) => p.id), ["3002"]);

  // With a part picked, the query belongs to the entries — every part still comes back.
  const picked = await lookup.scopedParts(state({ base: "part", part: "3001", query: "nonesuch" }));
  assert.deepEqual(picked.map((p) => p.id), ["3001"]);
});

test("a dimension matches however the query spells or spaces it", async () => {
  use({
    ...FILES,
    "/data/filtered/__any-__any-__any/index.csv":
      row("/entry/a/", "Jagged Wall", "s", "") + "\n" +
      row("/entry/b/", "Plate 1 x 2 Ring", "l", ""),
  });
  for (const query of ["1x2", "1 x 2", "1×2", "1 x"]) {
    const found = await lookup.scopedEntries(state({ query }));
    assert.deepEqual(found.map((e) => e.title), ["Plate 1 x 2 Ring"], `query "${query}"`);
  }

  use();
  const parts = await lookup.scopedParts(state({ base: "part", query: "2x3" }));
  assert.deepEqual(parts.map((p) => p.id), ["3002"]);
});

test("no parts outside the part scope", async () => {
  assert.deepEqual(await lookup.scopedParts(state({ base: "shape" })), []);
});

test("shuffling for random must not scramble the cached order it borrowed", async () => {
  const links = ["/entry/a/", "/entry/b/", "/entry/c/", "/entry/d/"];
  use({
    "/data/sorted/title-asc/index.csv": order(...links),
    "/data/sorted/date-desc/index.csv": order(...links),
    "/data/filtered/__any-__any-__any/index.csv":
      links.map((link, i) => row(link, "Entry " + i, "s", "")).join("\n"),
  });

  const before = await lookup.scopedEntries(state({ sort: "title-asc" }));

  // Fisher-Yates with a random that always returns 0 rotates the array — a
  // shuffle that reached the cache would be visible, and always the same way.
  const random = Math.random;
  try {
    Math.random = () => 0;
    await lookup.scopedEntries(state({ sort: "random" }));
  } finally {
    Math.random = random;
  }

  const after = await lookup.scopedEntries(state({ sort: "title-asc" }));
  assert.deepEqual(after.map((e) => e.link), before.map((e) => e.link));
  assert.deepEqual(after.map((e) => e.link), links);
});

test("a file is fetched once, however many states ask for it", async () => {
  let fetches = 0;
  lookup.useFetch((url) => {
    fetches += 1;
    return fetchFrom(FILES)(url);
  });

  await lookup.scopedEntries(state());
  const before = fetches;
  await lookup.scopedEntries(state({ query: "wall" }));
  assert.equal(fetches, before);
});
