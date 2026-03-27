# Contributing to BrickCamp

**Thank you** for your interest in contributing to BrickCamp! 
This guide will help you add new building techniques, understand our tag taxonomy, and follow best practices for content creation.

## Getting Started

### Running the Site Locally

Before contributing, ensure you have the local development environment set up. Follow the instructions in [README.md](README.md#local-setup).

## Creating a New Entry

### 0. Backup the source

If you discovered the technique somewhere online, please make sure the original source is saved in the [Wayback Machine](https://web.archive.org/).

Posts, pages and images vanish from the internet all the time. We want to make sure, original authors can still be attributed in case this happens.

### 1. Copy the template

New entries can be created using the provided [Hugo archetype](https://gohugo.io/content-management/archetypes).
Replace `[new-path]` with a fitting path for your entry and run this command:

```bash
hugo new content/entries/[your-path-here]/index.md
```

**Example**:
```bash
hugo new content/entries/brick/1x4/log/pentagon/index.md
```
This creates a new entry template.

### 2. Adapt the index.md

**The frontmatter** (the area between the two `+++` lines) must be adapted to fit your specific entry.

|   Field   |   Meaning   |
| --------- | ----------- |
| `title`   | The shortest possible description of the entry. It should clearly distinguish this entry from others, including likely future entries. |
| `date`    | The day this entry was created. Formatted as `YYYY-MM-DD` and using timezone UTC. |
| `url`     | The final URL of the entry. It starts with `/entry/` and must end with a trailing `/`. The rest in between should be based on the title, not the file path. |
| `aliases` | Earlier URLs of this entry. Remmove this if the entry is new. |
| `parts`   | A list of part numbers. Make sure every part number exists in the `content/parts` folder. |
| `size`    | Width, depth and height of the entry. Each is a number with a one-character-suffix for the unit. Supported units can be found in `data/entries/units/lengths.toml`. Try to use `s` (studs), `p` (stacked plates) or `b` (stacked bricks). |
| `uses`    | Lists other entries, that this entry is based on. Not properly defined yet.|
| `tags`    | See below.|

**Tags** are searches, that yield your entry as a result. A tag consists of three segments: [base]-[type]-[value].

| Tag / Description | Example |
| ----------------- | ------- |
| `angle-studtilt-*`<br> Angle between two planes of studs.<br> For 90° and 180°, this is often called "SNOT". |![](content\parts\2436\image.jpg)|
| `angle-studturn-*`<br> Angle between two stud rows in one plane.<br> Sometimes called "SNIR" or "SNARL". |![](content\parts\15706\image.jpg)|
| `length-studlift-*`<br> Distance between two parallel planes of studs|![](content\entries\minifig\utensil\goblet-offset\image.png)|


- **title** - A shortest-possible description of your entry, while still 

Properties like `aliases`, `uses` and non-fitting `tags` can be removed. The content (area after the second `+++` line) can contain multiple linkboxes. It should be at least 


Each entry requires these files in its directory:

- **`index.md`** - Entry metadata and content
- **`model.ldr`** - LDraw 3D model of the technique
- **`image.png`** - Preview image (auto-generated from model)
- **`link_*.jpg` or `link_*.png`** - Thumbnails for external resources

**Directory structure**:
```
content/entries/brick/1x2/sliding-connection/
├── index.md
├── model.ldr
├── image.png
├── link_01.jpg
└── link_02.jpg
```

### Step 3: Edit the Front Matter

The archetype creates an `index.md` with this structure:

```markdown
+++
title = 'Technique Name'
date  = '2026-03-08'
draft = true

url     = '/entry/brick-1x2-sliding-connection/'
aliases = ['/previous-url-if-applicable']

parts = ['3002', '3004']
size = ['2s', '3p', '4b']
uses = ['another-entry']
tags = [
  'angle-studtilt-90',
  'partcount-total-2',
  'shape-polygon-4',
]
+++
```

**Front Matter Fields**:

- **`title`** - Descriptive name of the technique
- **`date`** - Creation date (YYYY-MM-DD format)
- **`draft`** - Set to `false` when ready to publish
- **`url`** - Permanent URL for the entry (use kebab-case)
- **`aliases`** - Array of old URLs (for redirects)
- **`parts`** - Array of LEGO part numbers used (e.g., `['3001', '3003']`)
- **`size`** - Dimensions as array (e.g., `['8s', '8s', '2b']` = 8 studs × 8 studs × 2 bricks)
  - `s` = studs, `p` = plates (1/3 brick), `b` = bricks
- **`uses`** - Array of related entry URLs (for cross-referencing)
- **`tags`** - Array of classification tags (see [Tag Reference](#entry-tag-reference))

## Entry Tag Reference

Tags are the primary way entries are classified and discovered. This section explains each tag type with examples from actual entries.

### Angle Tags

Tags describing angular relationships between studs or parts.

#### `angle-studtilt-[1-180]`

**Meaning**: The angle (in degrees) that studs are tilted from their default vertical orientation.

**When to use**: When studs face a direction other than straight up due to part rotation or construction.

**Format**: `angle-studtilt-N` where N is the angle in degrees (1-180).

**Examples**:

- **90 degrees** - Studs perpendicular to normal (SNOT techniques)
  ```toml
  tags = ['angle-studtilt-90']
  ```
  *Used in*: [Brick Octagonal Square](content/entries/brick/octagonal/square/index.md), [Brick Headlight Square](content/entries/brick/headlight/square/index.md)

- **180 degrees** - Studs inverted (facing down)
  ```toml
  tags = ['angle-studtilt-180']
  ```
  *Used in*: [Brick 1x4 Inverted Doorrail](content/entries/brick/1x4/with-groove/inverted-doorrail/index.md)

- **Multiple angles** - Technique creates various angles
  ```toml
  tags = ['angle-studtilt-8', 'angle-studtilt-15', 'angle-studtilt-30', 'angle-studtilt-38', 'angle-studtilt-45']
  ```
  *Used in*: [Arch with Inner Plates](content/entries/arch/with-inner-plates/index.md)

#### `angle-studturn-[1-180]`

**Meaning**: The angle (in degrees) that studs are rotated horizontally around their vertical axis.

**When to use**: When parts are rotated in the horizontal plane, creating angles between stud grids.

**Format**: `angle-studturn-N` where N is the rotation angle in degrees.

**Examples**:

- **45 degrees** - Diagonal orientation
  ```toml
  tags = ['angle-studturn-45']
  ```
  *Used in*: [A-Plate Octagon](content/entries/wedge/plate/a-shape/octagon/index.md), [A-Plate Triangle](content/entries/wedge/plate/a-shape/12-12-17-triangle/index.md)

### Length Tags

Tags describing spatial offsets and distances.

#### `length-studlift-[1-10]`

**Meaning**: The vertical distance (in studs) that parts are lifted or offset from their base position.

**When to use**: When techniques create vertical spacing or height differences between connected elements.

**Format**: `length-studlift-N` where N is the number of studs (vertical).

**Examples**:

- **4 studs vertical** - 4-plate-height offset
  ```toml
  tags = ['length-studlift-4']
  ```
  *Used in*: [Brick Headlight Technic Brick and Jumper Offset](content/entries/brick/headlight/technic-brick-and-jumper-offset/index.md)

#### `length-studshift-[1-10]`

**Meaning**: The horizontal distance (in studs or fractions) that parts are shifted or offset.

**When to use**: When techniques create horizontal offsets between elements (e.g., jumper plates, half-stud shifts).

**Format**: `length-studshift-N` where N is the shift distance. Can be used without a number for unspecified shifts.

**Examples**:

- **Unspecified shift**
  ```toml
  tags = ['length-studshift']
  ```
  *Used in*: [Brick 1x4 Inverted Doorrail](content/entries/brick/1x4/with-groove/inverted-doorrail/index.md)

### Part Count Tags

Tags describing the quantity of parts used in a technique.

#### `partcount-segment-[1-999]`

**Meaning**: The number of parts in one repeating segment or unit of the technique.

**When to use**: When a technique has a repeating pattern, this indicates how many parts make up one repetition.

**Format**: `partcount-segment-N` where N is the number of parts per segment.

**Examples**:

- **1 part per segment**
  ```toml
  tags = ['partcount-segment-1', 'partcount-total-12']
  ```
  *Used in*: [Arch 1x3x2 Ring](content/entries/arch/1x3x2-ring/index.md) - 12 arches form a ring

- **2 parts per segment**
  ```toml
  tags = ['partcount-segment-2', 'partcount-total-8']
  ```
  *Used in*: [Brick Octagonal Square](content/entries/brick/octagonal/square/index.md) - 4 segments of 2 parts each

- **4 parts per segment**
  ```toml
  tags = ['partcount-segment-4', 'partcount-total-4']
  ```
  *Used in*: [Brick Headlight Square](content/entries/brick/headlight/square/index.md) - Single segment shown

#### `partcount-total-[1-999]`

**Meaning**: The total number of parts required to complete the technique as shown.

**When to use**: Always include this tag to indicate the complete part count.

**Format**: `partcount-total-N` where N is the total number of parts.

**Examples**:

- **Single part**
  ```toml
  tags = ['partcount-total-1']
  ```
  *Used in*: [Brick Octagonal with Sidestuds](content/entries/brick/octagonal/with-sidestuds/index.md)

- **Multiple parts**
  ```toml
  tags = ['partcount-total-8']
  ```
  *Used in*: [Brick Octagonal Square](content/entries/brick/octagonal/square/index.md), [A-Plate Octagon](content/entries/wedge/plate/a-shape/octagon/index.md)

### Repeat Tags

Tags describing the pattern type or repeatability of a technique.

#### `repeat-linear`

**Meaning**: The technique can be repeated in a straight line (1D repetition).

**When to use**: When parts can be chained or extended linearly.

**Examples**:

- **Linear chain**
  ```toml
  tags = ['repeat-linear', 'partcount-segment-2', 'partcount-total-4']
  ```
  *Used in*: [Brick 1x2 with Handle Interlocked](content/entries/brick/1x2/with-handle/interlocked/index.md)

- **Ring from linear segments**
  ```toml
  tags = ['repeat-linear']
  ```
  *Used in*: [Clip Bar 1.5L Ring](content/entries/clip/bar-1.5L/ring/index.md), [Plate 1x2 with Pinhole Ring](content/entries/plate/1x2/with-pinhole-on-top-ring/index.md)

#### `repeat-planar`

**Meaning**: The technique can be repeated in two dimensions to fill a plane (2D repetition).

**When to use**: When the technique tessellates or tiles across a flat surface.

**Examples**:

- **Tiled pattern**
  ```toml
  tags = ['repeat-planar']
  ```
  *Used in*: [Brick Headlight Tile 1x1 Wave](content/entries/brick/headlight/tile-1x1-wave/index.md), [Tile 1x2 Jumper Zigzag](content/entries/tile/1x2/jumper-zigzag/index.md)

- **Square pattern**
  ```toml
  tags = ['repeat-planar', 'partcount-segment-4']
  ```
  *Used in*: [Brick Headlight Square](content/entries/brick/headlight/square/index.md), [Plate 2x2 Turntable Pattern](content/entries/plate/2x2/turntable-top-on-plate/index.md)

#### `repeat-spacial`

**Meaning**: The technique can be repeated in three dimensions (3D repetition).

**When to use**: When the technique extends in X, Y, and Z directions to fill a volume.

**Status**: ⚠️ Defined in archetype but not yet used in any entries.

**Example format**:
```toml
tags = ['repeat-spacial']
```

#### `repeat-circular`

**Meaning**: The technique repeats in a circular or rotational pattern.

**When to use**: When segments are arranged radially around a center point.

**Status**: ⚠️ Defined in archetype but not yet used in any entries. Circular shapes typically use `shape-polygon-N` or `shape-circle` instead.

**Example format**:
```toml
tags = ['repeat-circular']
```

### Shape Tags

Tags describing the geometric shape created by the technique.

#### `shape-circle`

**Meaning**: The technique creates a circular shape.

**When to use**: For round constructions that approximate a circle (typically with many segments).

**Examples**:

- **Large circle**
  ```toml
  tags = ['shape-polygon-60', 'shape-circle', 'shape-star-60']
  ```
  *Used in*: [Plate Ring](content/entries/plate/ring/index.md) - 60-sided approximation of a circle

- **Medium circle**
  ```toml
  tags = ['shape-polygon-40', 'shape-circle']
  ```
  *Used in*: [Brick Headlight Ring](content/entries/brick/headlight/ring/index.md) - 40-sided circle

#### `shape-ellipse`

**Meaning**: The technique creates an elliptical or oval shape.

**When to use**: For elongated circular constructions with two different radii.

**Status**: ⚠️ Defined in archetype but not yet used in any entries.

**Example format**:
```toml
tags = ['shape-ellipse']
```

#### `shape-polygon-[3-999]`

**Meaning**: The technique creates a regular polygon with N sides.

**When to use**: For any polygonal shape. Number indicates vertex count.

**Format**: `shape-polygon-N` where N is the number of sides.

**Common polygons**:
- `shape-polygon-3` - Triangle (equilateral)
- `shape-polygon-4` - Square/Rectangle
- `shape-polygon-5` - Pentagon
- `shape-polygon-6` - Hexagon
- `shape-polygon-8` - Octagon
- `shape-polygon-12` - Dodecagon

**Examples**:

- **Triangle** (3 sides)
  ```toml
  tags = ['shape-polygon-3', 'partcount-segment-2', 'partcount-total-6']
  ```
  *Used in*: [A-Plate Triangle](content/entries/wedge/plate/a-shape/12-12-17-triangle/index.md)

- **Square** (4 sides)
  ```toml
  tags = ['shape-polygon-4', 'angle-studtilt-90', 'partcount-total-8']
  ```
  *Used in*: [Brick Octagonal Square](content/entries/brick/octagonal/square/index.md), [Brick Headlight in Hinge Square](content/entries/brick/headlight/in-hinge-square/index.md)

- **Hexagon** (6 sides)
  ```toml
  tags = ['shape-polygon-6']
  ```
  *Used in*: [Plate 1x2 with Towball Hexagon](content/entries/plate/1x2/with-towball-and-socket/hexagon/index.md)

- **Octagon** (8 sides)
  ```toml
  tags = ['shape-polygon-8', 'shape-star-8']
  ```
  *Used in*: [A-Plate Octagon](content/entries/wedge/plate/a-shape/octagon/index.md)

- **Dodecagon** (12 sides)
  ```toml
  tags = ['shape-polygon-12', 'shape-star-12']
  ```
  *Used in*: [Arch 1x3x2 Ring](content/entries/arch/1x3x2-ring/index.md), [Brick 2x2 with Brick 1x1 Round Ring](content/entries/brick/2x2/with-brick-1x1-round-ring/index.md)

#### `shape-polyhedron-[4-999]`

**Meaning**: The technique creates a three-dimensional polyhedron with N faces.

**When to use**: For 3D geometric solids. Number indicates face count.

**Format**: `shape-polyhedron-N` where N is the number of faces.

**Common polyhedrons**:
- `shape-polyhedron-4` - Tetrahedron
- `shape-polyhedron-6` - Cube/Hexahedron
- `shape-polyhedron-8` - Octahedron
- `shape-polyhedron-12` - Dodecahedron
- `shape-polyhedron-20` - Icosahedron

**Examples**:

- **Cube** (6 faces)
  ```toml
  tags = ['shape-polyhedron-6', 'partcount-segment-3', 'partcount-total-9']
  ```
  *Used in*: [Brick 1x1 SNOT Cube Tiled](content/entries/brick/1x1/studs-on-4-sides/cube/tiled/index.md), [Plate Topless Cube](content/entries/plate/toples/cube/index.md)

- **Octahedron** (8 faces)
  ```toml
  tags = ['shape-polyhedron-8']
  ```
  *Used in*: [Brick Headlight Cube](content/entries/brick/headlight/cube/index.md)

- **Complex polyhedron**
  ```toml
  tags = ['shape-polyhedron-48', 'shape-toroid']
  ```
  *Used in*: [Wedge Plate 3x6 Torus](content/entries/wedge/plate/3x6-torus/index.md)

#### `shape-sphere`

**Meaning**: The technique creates a spherical shape.

**When to use**: For approximately spherical constructions.

**Status**: ⚠️ Defined in archetype but not yet used in any entries.

**Example format**:
```toml
tags = ['shape-sphere']
```

#### `shape-star-[5-999]`

**Meaning**: The technique creates a star pattern with N points.

**When to use**: When alternating elements create a star or radial pattern (often combined with polygons).

**Format**: `shape-star-N` where N is the number of points.

**Examples**:

- **4-pointed star**
  ```toml
  tags = ['shape-star-4']
  ```
  *Used in*: [Brick 2x2 Corner Round 1960s Windmill Hub](content/entries/brick/2x2/corner-round/1960s-windmill-hub/index.md)

- **8-pointed star**
  ```toml
  tags = ['shape-polygon-8', 'shape-star-8']
  ```
  *Used in*: [A-Plate Octagon](content/entries/wedge/plate/a-shape/octagon/index.md), [Arch 1x3x2 Ring](content/entries/arch/1x3x2-ring/index.md)

- **24-pointed star**
  ```toml
  tags = ['shape-polygon-12', 'shape-star-24']
  ```
  *Used in*: [Brick 2x2 with Brick 1x1 Round Ring](content/entries/brick/2x2/with-brick-1x1-round-ring/index.md)

#### `shape-toroid`

**Meaning**: The technique creates a toroidal (donut/torus) shape.

**When to use**: For ring-shaped 3D structures with circular cross-sections.

**Examples**:

- **Torus**
  ```toml
  tags = ['shape-polyhedron-48', 'shape-toroid']
  ```
  *Used in*: [Wedge Plate 3x6 Torus](content/entries/wedge/plate/3x6-torus/index.md)

### Warning Tags

Tags indicating quality issues, construction concerns, or entry status. These help users and maintainers identify entries that need attention or have specific limitations.

#### `warning-stress`

**Meaning**: The technique involves stressed or forced connections that may damage parts.

**When to use**: When parts are forced together in ways that bend or stress the plastic.

**Status**: ⚠️ Defined in archetype but not yet used in any entries. Consider using `warning-stressing` instead.

**Example format**:
```toml
tags = ['warning-stress']
```

#### `warning-stressing`

**Meaning**: Parts are under stress or tension in the construction.

**When to use**: Similar to `warning-stress`, when connections are tight or parts are flexed.

**Examples**:

- **Stressed connection**
  ```toml
  tags = ['warning-stressing']
  ```
  *Used in*: [Brick 1x2 Ring](content/entries/brick/1x2/ring/index.md), [Slope Toothed Pattern](content/entries/slope/toothed-pattern/index.md)

#### `warning-loosely`

**Meaning**: Connections in the technique are loose or not firmly attached.

**When to use**: When parts don't snap together tightly or construction is fragile.

**Examples**:

- **Loose connection**
  ```toml
  tags = ['warning-loosely']
  ```
  *Used in*: [Wedge Brick 3x2 Ring](content/entries/wedge/brick/3x2-ring/index.md), [Tile 1x2 Grille Sandwich](content/entries/tile/1x2/grille/sandwich/index.md)

#### `warning-instable`

**Meaning**: The construction is unstable or prone to falling apart.

**When to use**: When the technique doesn't create a stable structure.

**Examples**:

- **Unstable construction**
  ```toml
  tags = ['warning-instable']
  ```
  *Used in*: [Slope Grate Connected](content/entries/slope/grate/connected/index.md), [Tile 1x2 Grille Lever SNOT](content/entries/tile/1x2/grille/lever-snot/index.md), [Plate Ring](content/entries/plate/ring/index.md)

#### `warning-improvable`

**Meaning**: The technique works but could be improved or optimized.

**When to use**: When a better version might exist or construction can be simplified.

**Examples**:

- **Could be improved**
  ```toml
  tags = ['warning-improvable']
  ```
  *Used in*: [Hinge Swivel Triangle Large](content/entries/hinge/swivel/triangle/large/index.md), [Technic Connector Hub 6 Axes](content/entries/technic/connector/hub-with-4-bars/6-perpendicular-axes/index.md)

#### `warning-incomplete`

**Meaning**: The entry is incomplete (missing information, images, or content).

**When to use**: For entries that are work-in-progress or need additional documentation.

**Examples**:

- **Incomplete entry**
  ```toml
  tags = ['warning-incomplete']
  ```
  *Used in*: [Arch Nested](content/entries/arch/nested/index.md)

#### `warning-link_404`

**Meaning**: One or more external resource links are broken (404 error).

**When to use**: When linked resources are no longer available.

**Examples**:

- **Broken link**
  ```toml
  tags = ['warning-link_404']
  ```
  *Used in*: [Brick Octagonal Square](content/entries/brick/octagonal/square/index.md), [Wedge Plate 3x12 Ring](content/entries/wedge/plate/3x12-ring/index.md), [Clip Wave Line](content/entries/clip/wave-line/index.md)

#### `warning-todo-angle`

**Meaning**: The angle calculation or measurement needs to be determined.

**When to use**: When creating an entry but the exact angle hasn't been calculated yet.

**Examples**:

- **Angle needs calculation**
  ```toml
  tags = ['warning-todo-angle']
  ```
  *Used in*: [Clip on Handle Switch Diagonals](content/entries/clip/on-handle/switch-diagonals/index.md), [Plate Switch Diagonals](content/entries/plate/switch-diagonals/index.md)

#### `warning-todo-length`

**Meaning**: The length or distance measurement needs to be determined.

**When to use**: When dimensions need to be calculated or measured.

**Examples**:

- **Length needs calculation**
  ```toml
  tags = ['warning-todo-length']
  ```
  *Used in*: [Clip on Handle Sliding](content/entries/clip/on-handle/sliding/index.md)

#### `warning-todo-joint`

**Meaning**: The joint or connection type needs to be analyzed or documented.

**When to use**: When connection mechanics need further investigation.

**Examples**:

- **Joint needs analysis**
  ```toml
  tags = ['warning-todo-joint']
  ```
  *Used in*: [Bar 2L with Towball Between Clips](content/entries/bar/2L-with-towball/between-clips/index.md)

## Adding External Resources

Each entry can reference external resources (tutorials, forum posts, Flickr photos, etc.) using the `linkbox` shortcode.

### Linkbox Syntax

```markdown
{{< linkbox
    author="Author Name"
    date="YYYY-MM-DD"
    image="link_01.jpg"
    title="Title of External Resource"
    url="https://example.com/resource"
>}}
Description or summary of the resource. Should be 1-3 sentences explaining what the resource shows or teaches.
{{< /linkbox >}}
```

### Example

```markdown
{{< linkbox
    author="Ryan Howerter"
    date="2012-04-16"
    image="link_01.jpg"
    title="Why?"
    url="https://www.flickr.com/photos/ltdemartinet/7085826707"
>}}
For a discussion in the LEGO flickr group about nested arch techniques and their applications.
{{< /linkbox >}}
```

### Multiple Resources

Include multiple `linkbox` shortcodes in sequence, incrementing the image filename:

```markdown
{{< linkbox ... image="link_01.jpg" ... >}}...{{< /linkbox >}}

{{< linkbox ... image="link_02.jpg" ... >}}...{{< /linkbox >}}

{{< linkbox ... image="link_03.jpg" ... >}}...{{< /linkbox >}}
```

## File Organization

### Naming Conventions

- **Directories**: Use lowercase with hyphens (kebab-case)
  - Good: `brick-1x1-snot/`, `sliding-door-rail/`
  - Bad: `Brick_1x1_SNOT/`, `slidingDoorRail/`

- **Images**: Use descriptive names
  - `image.png` - Main preview image
  - `link_01.jpg`, `link_02.jpg` - External resource thumbnails (numbered)

- **Models**: Always named `model.ldr`

### Category Selection

Choose the most appropriate category for your entry:

1. **Primary part type** - What is the main component?
   - Brick, plate, tile, slope, wedge, technic, etc.

2. **Specific variant** - What type of that part?
   - `brick/1x1/`, `plate/jumper/`, `technic/connector/`

3. **Technique name** - Descriptive name
   - `brick/1x1/studs-on-4-sides/cube/tiled/`

## Content Guidelines

### Quality Standards

- **Accuracy**: Verify that techniques are buildable and correctly documented
- **Clarity**: Use clear titles and descriptions
- **Attribution**: Always credit original creators in linkboxes
- **Images**: Include high-quality preview images and thumbnails
- **Models**: Provide accurate LDraw models that match the preview image

### What Makes a Good Entry

✅ **Good entries**:
- Document a specific, reusable technique
- Include multiple external resources showing variations
- Have accurate tags that help discovery
- Provide clear 3D models
- Credit original innovators

❌ **Avoid**:
- Generic "this is a brick" entries without technique
- Techniques that are just random part assemblies
- Entries without external references
- Missing or low-quality images
- Incomplete tagging

### Tagging Best Practices

1. **Be specific**: Use exact angle values when possible
2. **Include part counts**: Always add `partcount-total-N`
3. **Multiple tags okay**: One entry can have many tags
4. **Mark issues**: Use warning tags to help maintainers
5. **Shapes matter**: Add shape tags for any geometric patterns

## Parts System

Parts in the `content/parts/` directory are auto-generated from the Rebrickable API using the `parts.md` archetype. 

### How It Works

1. The archetype fetches part data from Rebrickable
2. Part information (name, image, URL) is automatically populated
3. Molds and alternates become aliases

### Creating Part Entries

Contributors typically don't need to create parts manually. When you reference a part number in an entry's `parts` array, the site will link to it. If the part doesn't exist, it can be auto-generated.

To manually create a part entry (requires Rebrickable API key):

```bash
hugo new content/parts/[part-number]/index.md
```

## Submission Process

### Before Submitting

1. **Test locally**: Run `hugo server -D` and verify your entry displays correctly
2. **Check images**: Ensure all images load and are reasonable file sizes
3. **Validate model**: Confirm `model.ldr` opens in LDraw viewers
4. **Review tags**: Double-check tag accuracy using this guide
5. **Set draft status**: Change `draft = true` to `draft = false` when ready

### Creating a Pull Request

1. **Fork the repository** on GitHub
2. **Create a branch** for your changes:
   ```bash
   git checkout -b add-entry-technique-name
   ```
3. **Commit your changes**:
   ```bash
   git add content/entries/category/technique-name/
   git commit -m "Add entry: Technique Name"
   ```
4. **Push to your fork**:
   ```bash
   git push origin add-entry-technique-name
   ```
5. **Open a Pull Request** on GitHub with:
   - Clear title describing the entry
   - Description of the technique
   - Links to external resources if applicable

### Review Process

Maintainers will review your submission for:
- Accuracy of information and tags
- Quality of images and models
- Proper attribution of resources
- Adherence to guidelines

You may be asked to make changes before the entry is merged.

## Questions?

If you have questions or need help:

- **Open an issue** on GitHub
- **Check existing entries** for examples
- **Review this guide** for tag meanings

Thank you for contributing to BrickCamp! Your documentation helps builders worldwide discover and learn new techniques.

---

*This guide is maintained by the BrickCamp community. Last updated: March 2026*
