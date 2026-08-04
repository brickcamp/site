<!-- Budget: 3kB; to add something, cut something. -->

# brick.camp

A Hugo **extended** static site: a visual dictionary of LEGO building
techniques with a client-side search over ~230 entries. Commands: README.

**A fact about one file belongs in its docstring** — purpose and usage,
not mechanics. This file holds only what no single file can state. No test
runner; verify JS against the built
`public/`, never the dev server — see the esbuild note below.

## Invisible couplings

Nothing joins these ends but a string convention; grep won't find them.

- **Lookup files.** `content/data/_content.gotmpl` emits the CSV pages that
  `lookup.js` fetches at `/data/filtered/<base>-<type>-__any/index.csv`. Parts
  at `/parts/<id>/index.csv`.
- **Scope catalog.** `_partials/scopes/getCatalog.html` feeds
  `_partials/nav/filter.html` (tabs, dropdowns), `layouts/data/scopes.json` for
  `assets/js/home/scope.js`, and `_partials/tags/renderButton.html` — so a tag
  button and the dropdown it links to cannot drift apart. Keyed by a filter's
  `slug`, not its file name; `parts.toml` is `part`.
- **A filter's `from`** does two unrelated jobs: build-side it decides which
  filters get lookup files (`tags` only), client-side `scope.js` uses it to spot
  the part scope (`parts`). Deliberately not a lookup page param.
- **JS-only CSS classes.** purgecss's allowlist is `hugo_stats.json`: only
  classes a *template* mentions. A class only a `classList.toggle` names must be
  safelisted in `postcss.config.js` or it ships with no rule behind it.
- **Wiring is one-directional:** events → app → view → DOM.

## Why value filtering is client-side

A Hugo content adapter **cannot read `Site.Taxonomies` / `Site.Pages`** — pages
don't exist when it runs, so it cannot enumerate values. Lookup files are
keyed by base and type only; `lookup.js` filters the pipe-joined `values` column.
This holds the file count at 18 however many values exist; don't move it back
into the build.

## Build behaviour

- Malformed tags and sizes fail the build naming the culprit; templates may
  assume well-formed input.
- Hugo **publishes no file for a CSV that renders empty**, so a scope no entry
  matches has no file; `lookup.js`'s `loadRows` reads that as no rows.
- `__any` (any type/value) is a path sentinel, written on both sides of the seam.
  There is no sentinel for an unlisted type, because there is none: `getSegments`
  fails the build on one. A tag naming *no* type is legal, opening the scope.
- Tag term pages are `render = 'never'`: a tag reaches `public/` only via a card
  or lookup file — renaming an unscoped tag changes no output.
- **`js.Build --minify` reorders statements across an `await`.** esbuild merged
  `const id = ++n;` into the following `await` declaration, so it ran *after* it —
  a check that passed always in `public/`, never in `hugo server`. Anything
  captured before an await must travel as an **argument** to the awaited call —
  see `app.js`'s `scopedItems(forState)`.
