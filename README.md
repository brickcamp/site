# BrickCamp

**A Visual Dictionary of Brick Building Techniques**

Preview hosted on GitHub Pages at <https://new.brick.camp>  
[![Build and deploy](https://github.com/brickcamp/site/actions/workflows/hugo.yaml/badge.svg)](https://github.com/brickcamp/site/actions/workflows/hugo.yaml)

## Overview
BrickCamp is a collection of entries, each highlighting a single building technique. All entries are searchable and filterable on the homepage, making it easy for builders to explore topics of interest.

Each entry includes metadata for purpose, size, and used LEGO® (or LEGO®-compatible) parts. It has links to external resources and a 3D CAD file (`model.ldr`).

## Foundations

This project would not be possible without:
- **[Hugo](https://gohugo.io/)** - Static site generator which does most of the heavy lifting here
- **[Bootstrap](https://getbootstrap.com/)** - Frontend toolkit that keeps our UI design simple and accessible
- **[Rebrickable API](https://rebrickable.com/api/)** - provides details on the used parts
- **[LDraw](https://ldraw.org/)** - Open Standard for LEGO CAD programs, used in the *.ldr files
  - **[LeoCad](https://www.leocad.org/)** - Our editor of choice for creating the CAD files
  - **[Three.js](https://threejs.org/)** - 3D Rendering of CAD files in the browser
- **[npm](https://nodejs.org/)** - Manages these PostCSS dependencies to improve the shipped styling:
  - **[purgecss](https://purgecss.com/guides/hugo.html)** - Removes unused CSS from the Bootstrap library
  - **[autoprefixer](https://www.npmjs.com/package/autoprefixer)** - Fixes custom CSS to work on most browsers
- **The world-wide community** of brick builders, that share their thoughts and creations online.

## Local Setup

To run this project locally, you need:
- **Git** - more on ([how to install](https://git-scm.com/install/))
- **Hugo** - more on ([how to install](https://gohugo.io/installation/))
- **Node.js** - more on [how to install](https://nodejs.org/en/download)

**1. Clone the Repository**

```bash
git clone https://github.com/brickcamp/site.git
cd site
```

**2. Install Dependencies**

```bash
npm install
```

**3. Configure Secrets (Optional)**

> [!TIP]
> Parts used before are already included. You only need this if you want to add new parts.

You will need a Rebrickable API key.  
First, create a free account on <https://rebrickable.com/register/>.  
Once logged in, go to `Account > Profile > Settings > API`.  
Click "Generate new API key".

Switch back to your workspace and copy the template for the API secrets:

```bash
cp data/secrets.example.toml data/secrets.toml
```

Add your generated Rebrickable API key to `data/secrets.toml` and save the file:

```toml
rebrickable = "your-api-key-here"
```


**4. Run development server**

```bash
hugo server
```

The site will now be generated and by default available at <http://localhost:1313/> on your device.


## Content Organization

### Entries
Entries live inside of the `content/entries` folder.  
To keep folder sizes manageable, use subfolders similar to this:  
`/[main-part]/[secondary-parts]/[assembly-method]/index.md`.

Shared path prefixes are grouped into common folders.  
The final entry folder should only contain:
```
├── index.md      # Metadata and content
├── model.ldr     # LDraw 3D model
├── image.png     # Preview image
└── link_*.jpg    # Link thumbnails
```

> [!NOTE]
> Use a `_` subfolder if an entry would be inside another entry's subfolder.  
> An entry needs a dedicated folder, otherwise Hugo won't see it as a page
> ([Hugo docs](https://gohugo.io/methods/page/kind/)).

### Parts
Parts live inside of the `content/parts` folder.  
Each part has a folder named according to its part number.

Trailing letters on the part number are ignored.
Similar parts, only distinguishable on closer inspection, are unified into one.

The part folder contains:
```
├── _index.md     # Metadata
└── image.jpg     # Preview image from Rebrickable API
```

### Tools
The folder `content/tools` shall be merged into `content/entries` in the future.

## Deployment

The site is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch. See [`.github/workflows/hugo.yaml`](.github/workflows/hugo.yaml) for the deployment workflow.

## Contributing

*TODO*

## License

*TODO*

---

*LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.*
