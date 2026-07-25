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

## The search feature (the non-obvious part)

The homepage (`layouts/home.html`) search is a small ES-module app in
`assets/js/home/`: `app.js` orchestrates, `data.js` fetches, `state.js`/`url.js`
hold state, `view.js` renders. It never queries a server — it fetches static CSV
lookup files produced at build time.

Pipeline — four stages, one core concept:

1. **Config** — `data/entries/filters/*.toml` define the filters (angle, length,
   shape, repeat, size, parts) and their `types` / `values`.
2. **Generate** — `content/data/_content.gotmpl` (a Hugo *content adapter*) emits one
   CSV lookup page per filter scope under `/data/filtered/…` and `/data/sorted/…`.
3. **Render** — `layouts/data/filtered.csv` (via `_partials/entries/getFiltered.html`,
   which dispatches on the filter's `from`) writes each row as
   `relPermalink → title → sizeType → values`, tab-separated.
4. **Fetch** — `data.js` requests `/data/filtered/<base>-<type>-__any/index.csv`, then
   filters rows by value on the client.

Parts are separate: taxonomy *term* pages output CSV (`layouts/parts/term.csv`,
enabled by the `outputs=["csv"]` cascade in `hugo.toml`), fetched at
`/parts/<id>/index.csv`.

### Tag grammar

Entry tags are **`base-type-value`**, e.g. `angle-studturn-28`, `shape-polygon-6`.
Parsed by `_partials/tags/getSegments.html` (type defaults to `else`, value to `0`
when a segment is absent). Taxonomies (`hugo.toml`): `tag`, `size`, `part`, `uses`.

### The key invariant

The `values` listed in a filter TOML are **curated dropdown quick-filters only**.
Entries may carry **any** value — `angle` entries include `28`, `37`, `72`… none of
which appear in `angle.toml`. Therefore:

- **Value filtering happens client-side** in `data.js`, against a `values` column
  (pipe-joined, e.g. `60|120|180`, because one entry can hold several values for the
  same base+type). Lookup files are keyed only by `base` and `type` — **never by
  value**. This keeps the generated file count fixed (~25) no matter how many values
  or entries exist, so the build stays linear.
- **Don't try to make the content adapter enumerate real values.** A Hugo content
  adapter **cannot access `Site.Taxonomies` / `Site.Pages`** (pages aren't built yet
  when it runs). That constraint is the whole reason value filtering lives on the
  client rather than in generated per-value files.

### Sentinels & gotchas

- `__any` (any type/value) and `__else` (unlisted types) are path sentinels. Note the
  asymmetry: JS uses `__any`, while `getSegments` defaults a *missing* type to `else`.
- Hugo does **not** publish a CSV that renders empty, so a scope with zero matching
  entries (e.g. a type no entry uses) produces **no file**. `data.js`'s `fetchCSV`
  treats a missing file as an empty result set, so this degrades gracefully instead of
  parsing the 404 page as rows.
- `size-*` and `part-*` files under `/data/filtered/` are generated but currently
  unused by the client (size is filtered client-side on the `size` column; parts use
  `/parts/…`).
