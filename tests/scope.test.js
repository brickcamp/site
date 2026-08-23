// What the catalog says a scope supports, and what it calls things.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as scope from "../assets/js/home/scope.js";
import { catalog } from "./helpers/catalog.js";

const ANY = scope.ANY;
const state = (patch) => ({ base: ANY, type: ANY, value: ANY, part: ANY, ...patch });

test.beforeEach(() => scope.init(catalog));

test("a base with no catalog entry supports nothing but size and sort", () => {
  const s = scope.scopeFor(state({ base: "nonesuch" }));
  assert.equal(s.hasTypes, false);
  assert.equal(s.hasValues, false);
  assert.equal(s.hasParts, false);
  assert.equal(s.hasSize, true);
  assert.equal(s.hasSort, true);
});

test("types and values follow the scope", () => {
  assert.equal(scope.scopeFor(state({ base: "shape" })).hasTypes, true);
  assert.equal(scope.scopeFor(state({ base: "shape" })).hasValues, true);
  assert.equal(scope.scopeFor(state({ base: "repeat" })).hasValues, false);
});

test("a novalues type closes the value dimension, and only while it is picked", () => {
  assert.equal(scope.scopeFor(state({ base: "shape", type: "circle" })).hasValues, false);
  assert.equal(scope.scopeFor(state({ base: "shape", type: "polygon" })).hasValues, true);
  assert.equal(scope.scopeFor(state({ base: "shape", type: ANY })).hasValues, true);
});

test("the part list is its own mode: no size, no sort", () => {
  const list = scope.scopeFor(state({ base: "part" }));
  assert.equal(list.isPartList, true);
  assert.equal(list.hasParts, true);
  assert.equal(list.hasSize, false);
  assert.equal(list.hasSort, false);
});

test("picking a part leaves the list and shows entries again", () => {
  const picked = scope.scopeFor(state({ base: "part", part: "3001" }));
  assert.equal(picked.isPartList, false);
  assert.equal(picked.hasParts, true);
  assert.equal(picked.hasSize, true);
  assert.equal(picked.hasSort, true);
});

test("labels come from the catalog", () => {
  const s = scope.scopeFor(state({ base: "shape" }));
  assert.equal(s.labelFor("type", ANY), "All Types");
  assert.equal(s.labelFor("value", ANY), "All Values");
  assert.equal(s.labelFor("size", ANY), "All Sizes");
  assert.equal(s.labelFor("type", "polygon"), "Polygon");
  assert.equal(s.labelFor("value", "6"), "6 Sides");
  assert.equal(s.labelFor("size", "l"), "Large");
  assert.equal(s.labelFor("sort", "title-asc"), "A – Z");
});

test("a value no dropdown lists is labelled through the scope's format", () => {
  const shape = scope.scopeFor(state({ base: "shape" }));
  assert.equal(shape.labelFor("value", "17"), "17 Sides");

  // No format string to fall back on: the slug stands in for itself.
  const repeat = scope.scopeFor(state({ base: "repeat" }));
  assert.equal(repeat.labelFor("value", "17"), "17");
});

test("an unknown slug labels itself rather than throwing", () => {
  const s = scope.scopeFor(state({ base: "shape" }));
  assert.equal(s.labelFor("type", "nonesuch"), "nonesuch");
  assert.equal(s.labelFor("sort", "nonesuch"), "nonesuch");
});

test("sortDefault comes from the catalog", () => {
  assert.equal(scope.sortDefault(), "date-desc");
});

test("load() fetches the catalog, and says so when it is missing", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => catalog });
    await scope.load("/data/scopes/index.json");
    assert.equal(scope.sortDefault(), "date-desc");

    globalThis.fetch = async () => ({ ok: false });
    await assert.rejects(scope.load("/nope.json"), /scope catalog missing/);
  } finally {
    globalThis.fetch = original;
  }
});
