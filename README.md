# brick.camp

A visual dictionary of LEGO building techniques.
Contains a few hundred entries, each showing a technique with the parts it takes,
the features it has, the space it occupies, and links to one or more sources.

[![Preview of the brick.camp homepage](./assets/images/readme-preview.png "Click to open website")](https://brick.camp/)

It's a [Hugo](https://gohugo.io/) static site hosted on GitHub Pages.
Searching happens entirely in the browser, against CSV lookup files generated at build time.

## Running it locally

Requires Node and **Hugo extended** ([how to install](https://gohugo.io/installation/)).
Version `0.164.0` publishes the `main` branch, see [`.github/workflows/hugo.yaml`](.github/workflows/hugo.yaml).

```sh
npm install            # install dependencies
hugo server            # dev server at http://localhost:1313
hugo server -D         # … including entries marked `draft = true`
hugo --gc --minify     # production build into public/
npm test               # homepage JS tests (see tests/)
```

## Adding content

Copy `.env.example` to `.env` and fill in the API keys. 
It's gitignored, so your keys won't be committed. 
Modelling and rendering shell out to [LeoCAD](https://www.leocad.org/)
and [LDView](https://tcobbs.github.io/ldview/), so install those too.

One command guides you through creating new content.
Just run it and follow the wizard:

```sh
npm run new            # an entry, a source link, a link image or a part
```

### Entries

A new entry runs through seven stages, and the modelling can take a while.
So it's resumable, and every stage works out for itself whether it's already done:

```sh
npm run entry          # newest entry, first unfinished stage
npm run entry 142      # a particular entry
```

The id is the entry's folder name without leading zeros.

Two things no stage touches, so write them by hand afterwards:
the `size`, and the `tags` (including `partcount-`).
Tags are shaped `base-type-value`, as in `angle-studturn-28` or `shape-polygon-6`.
A malformed one fails the build and is called out.

Renders take their settings from [`ldview.conf`](ldview.conf),
so your own LDView preferences won't interfere with anything.

### Parts

Part pages come from the [Rebrickable API](https://rebrickable.com/api/), 
and each part joins a part group (the buckets you see on the "parts" page).
`npm run new` files the parts it creates; this is for the ones added by hand:

```sh
npm run partgroups             # report what is unfiled
npm run partgroups -- --write  # file it, creating group pages as needed
```

## License

The repository splits three ways:

* **Code**, meaning templates, JavaScript, stylesheets and icons, is [MIT](LICENSE).
* **Content**, meaning entry texts, LDraw models, the renders built from them and the
  entry metadata, is [CC BY 4.0](LICENSE-CONTENT). Credit it as
  `brick.camp — CC BY 4.0 — https://brick.camp/`.
* **Everything else** is third-party material under its own terms: the bundled
  libraries, the Rebrickable part images, the thumbnail beside each source link and the
  LEGO® building-instruction crops in the [font entry](content/entries/02xx/0213/index.md). 
  [THIRD-PARTY.md](THIRD-PARTY.md) lists what and whose.
  Worth a look before reusing any image, since some of it sits inside `content/entries/`.

## Documentation

Architecture notes live in [AGENTS.md](AGENTS.md), which deliberately covers only what no
single file can explain on its own. Everything else is documented in the docstring of the 
partial or module it belongs to.
