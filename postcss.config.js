import purgeCSSPlugin from "@fullhuman/postcss-purgecss";
import autoprefixer from "autoprefixer";

const purgecss = purgeCSSPlugin({
  content: ["./hugo_stats.json"],
  defaultExtractor: (content) => {
    const els = JSON.parse(content).htmlElements;
    return [
      ...(els.tags || []),
      ...(els.classes || []),
      ...(els.ids || [])
    ];
  },
  safelist: {
    deep: [/dropdown-menu$/, /hidden/],
    greedy: [/data-bs-theme/],
  },
});

export default {
  plugins: [
    autoprefixer,
    process.env.HUGO_ENVIRONMENT === "production" ? purgecss : false,
  ],
};