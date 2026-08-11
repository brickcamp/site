<!-- Budget: 3kB; to add something, cut something. -->

# brick.camp

A Hugo **extended** static site: a visual dictionary of LEGO building
techniques with a client-side search on ~250 entries. Commands: README.

**A fact about one file belongs in its docstring** — purpose and usage, not
mechanics; this file holds only what no single file can state. No test runner:
verify JS against the built `public/`, never the dev server.

## Invisible couplings

Nothing joins these ends but a string convention; grep won't find them.

- **Lookup files.** `content/data/_content.gotmpl` emits the CSV pages that
  `lookup.js` fetches at `/data/filtered/<base>-<type>-__any/index.csv`. Parts
  at `/parts/<id>/index.csv`.
- **Scope catalog.** `_partials/scopes/getCatalog.html` feeds
  `_partials/nav/filter.html`, `layouts/data/scopes.json` (for
  `assets/js/home/scope.js`) and `_partials/tags/renderButton.html` — a tag
  button and the dropdown it links to cannot drift apart. Keyed by a filter's
  `slug`, not its file name; `parts.toml` is `part`.
- **A filter's `from`** does two unrelated jobs: build-side it decides which
  filters get lookup files (`tags` only), client-side `scope.js` uses it to spot
  the part scope (`parts`). Deliberately not a lookup page param.
- **Entry fields.** `entry-doc.js`'s schema names the archetype's front-matter
  keys, and the archetype is the only thing that puts them there. Rename one in
  `archetypes/entries.md` and the schema must follow — a required field then
  throws by name on every existing entry, an optional one goes quietly missing.
- **JS-only CSS classes.** purgecss's allowlist is `hugo_stats.json`: only
  classes a *template* mentions. A class named solely by a `classList.toggle`
  must be safelisted in `postcss.config.js` or it ships with no rule.
- **Wiring is one-directional:** events → app → view → DOM.

## Why value filtering is client-side

A content adapter **cannot read `Site.Taxonomies` / `Site.Pages`** — pages don't
exist yet, so it cannot enumerate values. Lookup files are keyed by base and type
only; `lookup.js` filters the pipe-joined `values` column, holding the file count
at 18 however many values exist. Don't move it back into the build.

## Build behaviour

- Malformed tags and sizes fail the build naming the culprit; templates may
  assume well-formed input.
- Hugo **publishes no file for a CSV that renders empty**: a scope no entry
  matches has no file, which `lookup.js`'s `loadRows` reads as no rows.
- `__any` is a path sentinel written on both sides of the seam. An unlisted type
  needs none — `getSegments` fails the build on one — but a tag naming *no* type
  is legal, and opens the scope.
- **A draft is excluded from `.Pages`**, so no entry partial runs on one: only
  `hugo -D` checks a new entry.
- Tag term pages are `render = 'never'`: a tag reaches `public/` only via a card
  or lookup file — renaming an unscoped tag changes no output.
- **`js.Build --minify` reorders statements across an `await`.** esbuild merged
  `const id = ++n;` into the following `await` declaration, so it ran *after* it,
  passing always in `public/` and never in `hugo server`. Anything captured
  before an await must travel as an **argument** to the awaited call — see
  `app.js`'s `scopedItems(forState)`.
