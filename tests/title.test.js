// The entry title convention, both ways: the title a slug generates, and the
// titles the 250-odd entries already carry.

import { test } from "node:test";
import assert from "node:assert/strict";

import { entryEditor } from "../scripts/entry-editor.js";
import { entryFile, entryIds } from "../scripts/entry.js";
import { titleCase, titleIssues } from "../scripts/title.js";

test("every word is capitalized", () => {
  assert.equal(titleCase("hexagonal-plate-with-curved-slopes"), "Hexagonal Plate with Curved Slopes");
});

test("a minor word stays lowercase inside, and is capitalized at either end", () => {
  assert.equal(titleCase("panel-under-doorrail"), "Panel under Doorrail");
  assert.equal(titleCase("a-plate-octagon"), "A Plate Octagon");
  assert.equal(titleCase("something-to-stand-on"), "Something to Stand On");
});

test("an acronym is spelled the way the table spells it", () => {
  assert.equal(titleCase("headlight-snot"), "Headlight SNOT");
  assert.equal(titleCase("toples-cube"), "ToPLES Cube");
});

test("each hyphen- or slash-separated part is a word of its own", () => {
  assert.equal(titleCase("double/inverted-slopes-square"), "Double/Inverted Slopes Square");
});

test("a dimension spaces out around a lowercase x, however the slug spells it", () => {
  assert.equal(titleCase("brick-2x4x2-with-holes-on-sides"), "Brick 2 x 4 x 2 with Holes on Sides");
  assert.equal(titleCase("2-x-2-studs-sandwich"), "2 x 2 Studs Sandwich");
});

test("titleIssues names what a hand-written title got wrong", () => {
  assert.deepEqual(titleIssues("Tiles In 2x2 Plate Underside"), [
    '"In" is a minor word — "in"',
    'a dimension spaces out — "1 x 2", not "1x2"',
  ]);
  assert.deepEqual(titleIssues("Clip-Handle Snot Cube"), ['"Snot" is spelled "SNOT"']);
  assert.deepEqual(titleIssues("Technic Bricks 1×1 Axle Hole SNOT"), [
    'a dimension joins with a lowercase ascii "x"',
  ]);
});

// The rules settle case, acronyms and dimensions — nothing else. A word the
// author chose to leave lowercase is the author's business.
test("titleIssues leaves a deliberate phrasing alone", () => {
  assert.deepEqual(titleIssues("Clip slides on Handle"), []);
  assert.deepEqual(titleIssues("Panel 1 x 2 x 1 enclosed by Hinge 2 x 2 Tops"), []);
});

test("every entry in content/ keeps to the convention", () => {
  const bad = entryIds()
    .map((id) => entryEditor(entryFile(id).file))
    .filter((doc) => doc.exists)
    .flatMap((doc) => titleIssues(doc.title).map((issue) => `${doc.title}: ${issue}`));
  assert.deepEqual(bad, []);
});
