// The URL is the state's only storage: what it carries, what it leaves out,
// and when it earns a history entry.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as url from "../assets/js/home/url.js";
import { installBrowser } from "./helpers/browser.js";

const DEFAULTS = Object.freeze({
  base: "__any", type: "__any", value: "__any", part: "__any", size: "__any",
  sort: "date-desc", query: "",
});

const search = () => globalThis.window.location.search;

test("every state key has a param, and the query is shortened to q", () => {
  installBrowser("https://brick.camp/?base=shape&type=polygon&value=6&part=3001&size=l&sort=title-asc&q=wall");
  assert.deepEqual(url.getState(DEFAULTS), {
    base: "shape", type: "polygon", value: "6", part: "3001", size: "l",
    sort: "title-asc", query: "wall",
  });
});

test("an absent param falls back to its default", () => {
  installBrowser("https://brick.camp/?base=shape");
  assert.deepEqual(url.getState(DEFAULTS), { ...DEFAULTS, base: "shape" });
});

test("params outside the state are left where they are", () => {
  installBrowser("https://brick.camp/?utm_source=elsewhere");
  url.pushState({ ...DEFAULTS, base: "shape" }, DEFAULTS);
  assert.equal(search(), "?utm_source=elsewhere&base=shape");
});

test("a value at its default is dropped rather than written", () => {
  installBrowser("https://brick.camp/?base=shape&size=l");
  url.pushState({ ...DEFAULTS, base: "shape" }, DEFAULTS);
  assert.equal(search(), "?base=shape");
});

test("a state that changes nothing writes no history entry", () => {
  const calls = installBrowser("https://brick.camp/?base=shape");
  url.pushState({ ...DEFAULTS, base: "shape" }, DEFAULTS);
  assert.deepEqual(calls, []);
});

test("push and replace differ only in which history call they make", () => {
  const pushes = installBrowser("https://brick.camp/");
  url.pushState({ ...DEFAULTS, base: "shape" }, DEFAULTS);
  assert.equal(pushes[0].kind, "push");

  const replaces = installBrowser("https://brick.camp/");
  url.replaceState({ ...DEFAULTS, base: "shape" }, DEFAULTS);
  assert.equal(replaces[0].kind, "replace");
});
