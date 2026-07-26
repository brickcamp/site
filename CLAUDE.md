# CLAUDE.md

BrickCamp — a Hugo **extended** static site: a visual dictionary of LEGO building
techniques with a client-side search over ~230 "entries". No backend; search runs
entirely against CSV lookup files generated at build time.

## Commands

- **Dev server:** `hugo server` → http://localhost:1313
- **Production build:** `hugo --gc --minify` → `public/` (as GitHub Pages CI,
  see `.github/workflows/hugo.yaml`)
- Requires Hugo extended ≥ 0.145 (CI pins 0.152). JS is bundled by Hugo's
  `js.Build` — there is no separate bundler or test runner.
- `data/secrets.toml` is local config (see `secrets.example.toml`); don't commit secrets.

## The search feature

The homepage (`layouts/home.html`) search is a small ES-module app in
`assets/js/home/`: `app.js` orchestrates, `lookup.js` turns a state into the items
to show, `state.js`/`url.js` hold state, `view.js` renders. It never queries a
server — it fetches static CSV lookup files produced at build time.

Pipeline — four stages, one core concept:

1. **Config** — `data/entries/filters/*.toml` define the filters (angle, length,
   shape, repeat, size, parts) and their `types` / `values`.
2. **Generate** — `content/data/_content.gotmpl` (a Hugo *content adapter*) emits one
   CSV lookup page per filter scope under `/data/filtered/…` and `/data/sorted/…`.
   Only `from = "tags"` filters get lookup pages; an unknown `from` fails the build.
3. **Render** — `layouts/data/filtered.csv` (via `_partials/entries/getFiltered.html`,
   which walks the tag taxonomy) writes each row as
   `relPermalink → title → sizeType → values`, tab-separated.
4. **Fetch** — `lookup.js` requests `/data/filtered/<base>-<type>-__any/index.csv`,
   then filters rows by value on the client.

Parts are separate: taxonomy *term* pages output CSV (`layouts/parts/term.csv`,
enabled by the `outputs=["csv"]` cascade in `hugo.toml`), fetched at
`/parts/<id>/index.csv`.

### Entry facts

Everything derived about an entry lives in `_partials/entries/facts.html`, cached per
entry in its `Store`: `size.type` / `size.volume` / `size.short` / `size.long` and
`parts.min` / `parts.max`. It parses the `size` params (`"4s"`, `"1b"`, …) **once** and
derives the LDU lengths, the size band and the display text from that one parse — add a
derived value here rather than recomputing it at a call site. A missing `size`, an unknown
unit, or a missing `partcount-total-` tag fails the build naming the entry.

Sortings name facts by dotted path: `data/entries/sortings.toml` sets
`field = 'size.volume'` with `from = 'facts'` (`from = 'page'` is the default and means a
field on the page itself).

### The scope catalog

A filter is configured in `data/entries/filters/*.toml`.
`_partials/scopes/getCatalog.html` turns those files into one catalog
and two consumers read it: 
`_partials/nav/filter.html` renders the tabs and dropdowns from it;
 `layouts/data/scopes.json` publishes the json for the client.
`assets/js/home/scope.js` fetches the json.

### How a click becomes state

Controls declare their intent in markup: 
`data-dim` (a state dimension — `base`, `type`, `value`, `size`, `sort`, `part`) 
and `data-value`. `events.js` reads that pair off `closest("[data-dim][data-value]")`
and emits `{[dim]: value}`. Dropdown items also carry `data-scope`, which `view.js` 
uses to hide the other scopes' items.

Wiring is one-directional — `events → app → view → DOM`.

### Tag grammar

Entry tags are **`base-type-value`**, e.g. `angle-studturn-28`, `shape-polygon-6`.
The type and the value are optional and **the value is always a number** — a
non-numeric value segment fails the build naming the tag. Parsed by
`_partials/tags/getSegments.html`, which returns `base` / `type` (defaults to
`else`) / `value` (an int, `0` when absent) / `hasScope`.

`hasScope` says whether the base has a search scope — a filter in
`data/entries/filters/*.toml` with `from = "tags"`. It is what decides whether a
tag renders a card: `partcount-`, `warning-`, `todo-` and `font` have no icon and
nothing to link to, so `renderMetadata` skips them and `tags/renderCard` (which
takes the segments dict, not the term page) has only one shape to render. Adding
a base that should *not* be searchable needs no template edit.

Taxonomies (`hugo.toml`): `tag`, `size`, `part`, `uses`. Tag term pages are
`render = 'never'`, so a tag only reaches `public/` through a card or a lookup
file — renaming an unscoped tag changes no output.

### The key invariant

The `values` listed in a filter TOML are **curated dropdown quick-filters only**.
Entries may carry **any** value — `angle` entries include `28`, `37`, `72`… none of
which appear in `angle.toml`. Therefore:

- **Value filtering happens client-side** in `lookup.js`, against a `values` column
  (pipe-joined, e.g. `60|120|180`, because one entry can hold several values for the
  same base+type). Lookup files are keyed only by `base` and `type` — **never by
  value**, and `getFiltered` takes no `value` argument. This keeps the generated file
  count fixed (18) no matter how many values or entries exist, so the build stays linear.
- **Don't try to make the content adapter enumerate real values.** A Hugo content
  adapter **cannot access `Site.Taxonomies` / `Site.Pages`** (pages aren't built yet
  when it runs). That constraint is the whole reason value filtering lives on the
  client rather than in generated per-value files.

### Sentinels & gotchas

- `__any` (any type/value) and `__else` (unlisted types) are path sentinels. Note the
  asymmetry: JS uses `__any`, while `getSegments` defaults a *missing* type to `else`.
- Hugo does **not** publish a CSV that renders empty, so a scope with zero matching
  entries (e.g. a type no entry uses) produces **no file**. `lookup.js`'s `loadRows`
  treats a missing file as an empty result set.
- A filter's `from` has **two unrelated jobs**. Build-side, `_content.gotmpl` uses it
  to decide which filters get lookup files — only `from = "tags"`, because size is
  filtered client-side on the `size` column and parts come from `/parts/…`. Client-side,
  `getCatalog` publishes it so `scope.js` can recognise the part-list scope
  (`from === "parts"`). It is deliberately *not* in the lookup page's params.
- **`js.Build --minify` reorders statements across an `await`.** esbuild merged
  `const id = ++n;` (and even a function call) into the following `await`
  declaration, so it ran *after* the await — a "am I still the newest?" check
  passed always in `public/`, never in `hugo server`. Anything captured before an
  await must travel as an **argument** to the awaited call, as `app.js`'s
  `scopedItems(forState)` does. Check the built `public/index.html`, not the dev
  server, when order matters.
