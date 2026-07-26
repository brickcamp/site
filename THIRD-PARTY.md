# Third-party material

brick.camp's own code is MIT ([LICENSE](LICENSE)) and its own content is
CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT)). Neither of those covers the
material listed on this page.

Most of the images in this repository are not ours to relicense. Some of them
live inside `content/entries/` right next to content that *is* CC BY, so you
cannot tell by directory alone — check the file patterns below before reusing
anything.

## Bundled code

| Path | Component | License |
| --- | --- | --- |
| `assets/css/bootstrap.min.css`, `assets/js/bootstrap.bundle.min.js` | Bootstrap 5.3.7 | MIT © The Bootstrap Authors |
| `assets/js/three.core.min.js`, `assets/js/three.module.min.js` | three.js r182 | MIT © Three.js Authors |
| `assets/js/LDrawLoader.js` | `LDrawLoader` from the three.js examples | MIT © Three.js Authors |
| `static/ldraw/**/*.dat` | LDraw Parts Library (9 files) | CC BY 4.0 © the LDraw contributors |

Each bundled file carries its own license header. The LDraw Parts Library ships
its own terms alongside the parts, in
[`static/ldraw/CAreadme.txt`](static/ldraw/CAreadme.txt) and
[`static/ldraw/CAlicense4.txt`](static/ldraw/CAlicense4.txt).

## Images we do not own

### Part images — `content/parts/*/image.jpg`

Retrieved from the [Rebrickable API](https://rebrickable.com/api/). Rebrickable
allows these images to be displayed, downloaded and hotlinked by external sites.
That permission runs from Rebrickable to this project; it is not ours to pass on
under CC BY. Every part page links back to its source on Rebrickable. If you
want these images, take them from Rebrickable under their terms, not from here.

### Source thumbnails — `content/entries/**/link_*.jpg`, `link_*.png`

The thumbnail shown beside each source an entry cites: forum posts, PDFs,
videos, set pages and product photography. They are reproduced to identify the
work being linked to. Copyright stays with the respective owners, who are named
in the `author` and `url` arguments of the `linkbox` shortcode next to each
image.

### LEGO building instructions — `content/entries/font/set-41839/`

`image.png` and everything in `ascii/` are crops from official LEGO publications
for set 41839, reproduced to document the alphabet that set builds. They are the 
LEGO Group's artwork. Unlike the rest of the entry renders, no LDraw model exists 
for them, and they are not covered by CC BY 4.0.

## Renders and the LDraw library

Our own renders — `content/entries/**/image.png`, excluding the font entry above
— are generated from the `model.ldr` / `model.mpd` file sitting beside each one,
using geometry from the LDraw Parts Library. That library is CC BY 4.0 and asks
for attribution, and that requirement travels with anything rendered from it. So
when reusing a render, credit both:

    brick.camp — CC BY 4.0 — https://brick.camp/
    LDraw Parts Library — CC BY 4.0 — https://www.ldraw.org/

## Trademark

LEGO® is a trademark of the LEGO Group, which does not sponsor, authorise or
endorse this project. The LEGO Group's trademarks appear in the linked product
photography, in the building-instruction crops above, and in the part geometry
itself — the logo moulded onto stud tops is part of the LDraw parts and shows up
in every render. No license in this repository grants any right in those
trademarks.
