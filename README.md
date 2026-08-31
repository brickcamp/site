# brick.camp

A visual dictionary of LEGO building techniques.
Contains a few hundred entries, each showing a technique with the parts it takes, 
the features it has, the space it occupies, and links to one or more sources.

[![Preview of the brick.camp homepage](./assets/images/readme-preview.png "Click to open website")](https://brick.camp/)

It's a [Hugo](https://gohugo.io/) static site with no backend.
Searching is done entirely in the browser, against CSV lookup files generated at build time.

## Local setup

Requires **Hugo extended** ([how to install](https://gohugo.io/installation/)).  
We currently use version `0.164.0` to publish our `main` branch via GitHub Pages, 
see [`.github/workflows/hugo.yaml`](.github/workflows/hugo.yaml).

```sh
npm install            # for installing all dependencies
hugo server            # runs a dev server at http://localhost:1313
hugo server -D         # … includes entries marked with `draft = true`
hugo --gc --minify     # production build into public/
npm test               # runs the homepage JS tests (see tests/)
```

`npm test` needs no browser and no build. One file, [`tests/build.test.js`](tests/build.test.js),
additionally runs the same modules against whatever is in `public/` and skips
itself when there is nothing there — so build first if you want that check.

Copy `.env.example` to `.env` and fill in the values — it's gitignored, so your keys won't be committed.
Otherwise, the scripts in the next section won't work properly.
For modelling and rendering, the scripts will try to call [LeoCAD](https://www.leocad.org/)
and [LDView](https://tcobbs.github.io/ldview/). So these should be installed.

## Adding content

Run the following command to add content. It guides you through the options of the following sub-sections.

```sh
npm run new
```

### Entry

Creating a new entry happens in **stages**:

| Stage | Does |
|---|---|
| `scaffold` | Creates `index.md` and a header-only `model.ldr` in a new entry folder; based on [`archetypes/entries.md`](archetypes/entries.md) |
| `model` | Opens the model stub in LeoCAD and standardizes the header on every later pass |
| `render` | Runs LDView with an image pipeline to generate the `image.png`. The `render = { lat, lon, fov }` in `index.md` is the viewing angle and the field of view — a narrow `fov` flattens the perspective, a wide one exaggerates it. |
| `parts` | Reads the parts from the model, resolves aliases and offers the id list to correct mistakes |
| `sources` | Appends a `linkbox` per given source URL |
| `verify` | Builds **with** drafts, drops `draft = true`, builds for real, then opens the entry in a browser to look at |
| `commit` | Commits the entry folder and any part pages it needed |

You can **resume the process** because this might take some time (especially the modelling).

```sh
npm run entry                # continue on the newest entry, with the first unfinished stage
npm run entry 142            # continue a particular entry (by id)
npm run entry 142 render     # run/re-run a specific stage on a particular entry
npm run entry render         # …the same stage, but on the newest entry
```

The id is the folder name of the entry, without leading zeros. Folders under `content/entries/` are bucketed by the hundred to avoid overly long directory lists.

An entry always gets two URLs: `/e/[id]` and `/entry/[your-human-readable-slug]/`.
The `size` and `tags` (including `partcount-`) always need to be done manually. 
Tags are always shaped like `base-type-value` (`angle-studturn-28`, `shape-polygon-6`); 
malformed ones fail the build and tell you which tag was wrong.

Hint: Changing LDView's preferences won't change a render.
The settings are taken from [`ldview.conf`](ldview.conf).
It's like a normal LDView setting file, but without volatile or install-specific keys like: 
`ExtraSearchDirs\*`, `RecentFiles\*`, `Last*`, `Window*`, `Toolbar`, `UnofficialPartChecks\*`, `PovExporter\*` and `LDrawDir`.

### Link / Link image

Links append a `linkbox` shortcode to the entry's `index.md` and save the
150×150 preview image next to it as `link_[xx].jpg`. 

Metadata comes from [Peekalink](https://www.peekalink.io/), 
falling back to [Microlink](https://microlink.io/) and then the page's meta tags.
Flickr has a custom logic, as it is often referenced in this project.

Review the result — anything the sources didn't know is left as an
empty attribute. A **link image** is the preview-image treatment on its own, 
in case the image is missing or needs to be swapped.

### Parts

**Parts** get `content/parts/[partnumber]/_index.md` from the Rebrickable API,
with the part image downloaded next to it. 
Adding new parts needs a [Rebrickable API](https://rebrickable.com/api/) key in `.env`.

A part also joins a **part group** — the browsing buckets the part list opens
on, in `content/partgroups/`, one per Rebrickable part category. `npm run new`
files a new part and creates the group page if it is the first of its kind, so
this is only for parts added by hand or filed wrong:

```sh
npm run partgroups             # report what is unfiled
npm run partgroups -- --write  # file it, creating the group pages it needs
```

It never re-files a part that already names a group; move one by editing its
`partgroups` front matter.

## License

The repository splits three ways:

* **Code** — templates, JavaScript, stylesheets and icons — is [MIT](LICENSE).
* **Content** — entry texts, LDraw models, the renders built from them and the
  entry metadata — is [CC BY 4.0](LICENSE-CONTENT). Credit it as
  `brick.camp — CC BY 4.0 — https://brick.camp/`.
* **Everything else** is third-party material under its own terms: the bundled
  libraries, the Rebrickable part images, the thumbnail beside each source link
  and the LEGO® building-instruction crops in the font entry.
  [THIRD-PARTY.md](THIRD-PARTY.md) lists what and whose — worth a look before
  reusing any image, since some of it sits inside `content/entries/`.

## Notes for AI agents

Architecture notes live in [AGENTS.md](AGENTS.md), which deliberately covers only
what no single file can explain on its own. Everything else is documented in the
partial or module it belongs to.
