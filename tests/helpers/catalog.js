// A scope catalog fixture in the shape _partials/scopes/getCatalog.html emits.
// Small on purpose: one scope per trait the JS branches on, not a copy of
// data/entries/filters/*.toml. The real catalog is exercised in build.test.js.

export const catalog = {
  dimensions: {
    type: { anyTitle: "All Types" },
    value: { anyTitle: "All Values" },
    size: {
      anyTitle: "All Sizes",
      options: [
        { slug: "s", title: "Small" },
        { slug: "l", title: "Large" },
      ],
    },
    sort: {
      default: "date-desc",
      options: [
        { slug: "date-desc", title: "Newest" },
        { slug: "title-asc", title: "A – Z" },
        { slug: "random", title: "Random" },
      ],
    },
  },
  scopes: [
    // No dimensions of its own — the state every page opens on.
    { slug: "__any", title: "All", from: "", valueFormat: "", types: [], values: [] },

    // Types and values, and one type that carries no values (novalues).
    {
      slug: "shape",
      title: "Shapes",
      from: "tags",
      valueFormat: "%s Sides",
      types: [
        { slug: "polygon", title: "Polygon", hasValues: true },
        { slug: "circle", title: "Circle", hasValues: false },
      ],
      values: [
        { slug: "3", title: "3 Sides" },
        { slug: "6", title: "6 Sides" },
      ],
    },

    // Types but no values at all.
    {
      slug: "repeat",
      title: "Repeat",
      from: "tags",
      valueFormat: "",
      types: [{ slug: "linear", title: "Linear", hasValues: true }],
      values: [],
    },

    // The part scope: `from` is what marks it, on this side of the seam.
    { slug: "part", title: "Parts", from: "parts", valueFormat: "", types: [], values: [] },
  ],
};
