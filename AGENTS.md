<!-- Budget: 3000 bytes. To add something, cut something. -->

# brick.camp

A Hugo **extended** static site: a visual dictionary of LEGO building
techniques with a client-side search over ~230 entries. Run and build commands
are in the README.

**A fact about one file belongs in that file's docstring.** This file holds only
what no single file can state. There is no test runner; verify JS against the
built `public/`, never the dev server — see the esbuild note below.

## Invisible couplings

Nothing joins these ends but a string convention, so grep won't find them.

- **Lookup files.** `content/data/_content.gotmpl` emits the CSV pages that
  `lookup.js` fetches at `/data/filtered/<base>-<type>-__any/index.csv`. Parts
  live at `/parts/<id>/index.csv`.
- **Scope catalog.** `_partials/scopes/getCatalog.html` feeds
  `_partials/nav/filter.html` (tabs, dropdowns), `layouts/data/scopes.json`,
  which `assets/js/home/scope.js` fetches, and `_partials/tags/renderButton.html`
  — so a tag button and the dropdown entry it links to cannot drift apart. It is
  keyed by a filter's `slug`, not its file name; `parts.toml` is `part`.
- **A filter's `from`** does two unrelated jobs: build-side it decides which
  filters get lookup files (`tags` only), client-side `scope.js` uses it to spot
  the part scope (`parts`). Deliberately not a lookup page param.
- **Wiring is one-directional:** events → app → view → DOM.

## Why value filtering is client-side

A Hugo content adapter **cannot read `Site.Taxonomies` / `Site.Pages`** — pages
don't exist yet when it runs. So it cannot enumerate real values, and lookup files
are keyed by base and type only; `lookup.js` filters on the pipe-joined `values`
column instead. This holds the generated file count at 18 however many entries or
values exist. Don't try to move it back into the build.

## Build behaviour

- Malformed tags and sizes fail the build naming the culprit, so templates may
  assume well-formed input.
- Hugo **publishes no file for a CSV that renders empty**, so a scope no entry
  matches has no file at all. `lookup.js`'s `loadRows` treats that as no rows.
- `__any` (any type/value) is a path sentinel, written on both sides of the seam.
  There is no sentinel for an unlisted type, because there is no unlisted type:
  `getSegments` fails the build on one. A tag naming *no* type is legal and opens
  the whole scope.
- Tag term pages are `render = 'never'`, so a tag reaches `public/` only through a
  card or a lookup file — renaming an unscoped tag changes no output.
- **`js.Build --minify` reorders statements across an `await`.** esbuild merged
  `const id = ++n;` into the following `await` declaration, so it ran *after* the
  await — an "am I still the newest?" check that passed always in `public/`, never
  in `hugo server`. Anything captured before an await must travel as an
  **argument** to the awaited call, as `app.js`'s `scopedItems(forState)` does.
