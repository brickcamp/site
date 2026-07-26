# brick.camp

A visual dictionary of LEGO building techniques — around 230 entries, each
showing a technique with the parts it takes, the space it occupies, and a link to
where it came from.

[![](./assets/images/readme-preview.png "Preview of the brick.camp homepage")](https://new.brick.camp/)

It's a [Hugo](https://gohugo.io/) static site with no backend. The search on the
homepage runs entirely in the browser, against CSV lookup files generated at
build time.

## Running it

Requires **Hugo extended** 0.145 or newer; CI builds with 0.152.2.

```sh
npm install            # PostCSS tooling for the stylesheets
hugo server            # dev server at http://localhost:1313
hugo --gc --minify     # production build into public/
```

Pushing to `main` builds and publishes to GitHub Pages automatically, via
[`.github/workflows/hugo.yaml`](.github/workflows/hugo.yaml).

## Adding an entry

```sh
hugo new content/entries/[descriptive-path]/index.md
```

The `[descriptive-path]` should be similar to existing paths.
The scaffold comes from [`archetypes/entries.md`](archetypes/entries.md), 
which lists every tag the site understands along with its allowed range.

Fill in the title, the `size`, the `parts` it uses and whichever tags apply, put
the images next to `index.md`, then drop `draft = true` when it's ready. Tags are
written `base-type-value` (`angle-studturn-28`, `shape-polygon-6`); malformed
ones fail the build and tell you which tag was wrong.

If the entry's image is not yours — a crop from instructions, say — set
`imageCredit` in the front matter to name the rightsholder, and drop an
`ATTRIBUTION.txt` beside the image. Hugo publishes that file next to the image
itself, so the notice survives being downloaded. `content/entries/font/set-41839/`
is the worked example.

Adding new parts additionally needs a [Rebrickable API](https://rebrickable.com/api/)
key. Copy `data/secrets.example.toml` to `data/secrets.toml` and fill it in — it's
gitignored, so it won't be committed.

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
