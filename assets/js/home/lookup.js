// The entry lookup: 
// Fetch lookup files, convert them to entries and sort/filter/search them.

import { ANY, scopeFor } from "./scope.js";

const PARTS_URL = "/parts/index.csv";
const TITLE_ORDER_URL = "/data/sorted/title-asc/index.csv";

const cache = new Map();

let fetchFile = (url) => fetch(url);

// The only injected dependency, so the lookup can be exercised without a network.
export function useFetch(fn) {
  fetchFile = fn;
  cache.clear();
}

export async function scopedEntries(state) {
  if (scopeFor(state).isPartList) {
    return [];
  }

  const [order, entries] = await Promise.all([
    fetchSortOrder(state),
    fetchEntries(state),
  ]);

  const sorted = inOrderOf(entries, "link", order);
  return bySearch(byFieldValue(sorted, "size", state.size), state.query);
}

export async function scopedParts(state) {
  if (!scopeFor(state).hasParts) {
    return [];
  }

  const parts = await fetchRows(PARTS_URL, parsePartRow);
  if (state.part !== ANY) {
    return parts.filter((part) => part.id === state.part);
  }

  // Listing all parts is the one mode in which the search box acts on parts.
  return bySearch(parts, state.query);
}

async function fetchSortOrder(state) {
  if (state.sort === "random") {
    // no own lookup file, shuffle title file instead
    return shuffle(await fetchRows(TITLE_ORDER_URL, parseLinkRow));
  }
  return fetchRows("/data/sorted/" + state.sort + "/index.csv", parseLinkRow);
}

async function fetchEntries(state) {
  if (state.part !== ANY) {
    return fetchRows("/parts/" + state.part + "/index.csv", parseEntryRow);
  }

  // Lookup files are keyed by base and type only, never by value — entries carry
  // values no dropdown lists — so the value filter has to run here.
  const scope = [state.base, state.type, ANY].join("-");
  const entries = await fetchRows("/data/filtered/" + scope + "/index.csv", parseEntryRow);
  if (state.value === ANY) {
    return entries;
  }
  return entries.filter((entry) => entry.values.includes(state.value));
}

async function fetchRows(url, parseRow) {
  if (!cache.has(url)) {
    cache.set(url, await loadRows(url, parseRow));
  }
  // Hand out a copy, so sort/shuffe/... can't change the cache.
  return cache.get(url).slice();
}

async function loadRows(url, parseRow) {
  const res = await fetchFile(url);
  if (!res.ok) {
    // this is normal, Hugo does not publish a CSV that renders empty
    return [];
  }

  const text = await res.text();
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseRow);
}

// The sort order is a list of links; entries missing from it drop out.
// Sortings that covers only some entries narrow the result.
function inOrderOf(objects, field, sortedValues) {
  const positions = new Map(sortedValues.map((value, i) => [value, i]));
  return objects
    .filter((obj) => positions.has(obj[field]))
    .sort((a, b) => positions.get(a[field]) - positions.get(b[field]));
}

function byFieldValue(objects, field, value) {
  if (!value || value === ANY) {
    return objects;
  }
  return objects.filter((obj) => obj[field] === value);
}

function bySearch(objects, search) {
  if (!search) {
    return objects;
  }
  return objects.filter((obj) => obj.title.toLowerCase().includes(search));
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Entry rows are written by layouts/_partials/entries/getLookupRow.html,
// so change columns there and here together.
function parseEntryRow(line) {
  const [link, title, size, values] = line.split("\t");
  return {
    link: link,
    image: link + "__image-min.webp",
    title: title,
    size: size,
    values: values ? values.split("|") : [],
  };
}

// Part rows are written by layouts/parts/taxonomy.csv.
function parsePartRow(line) {
  const [id, title] = line.split("\t");
  return {
    id: id,
    link: "#",
    image: "/parts/" + id + "/__image-min.webp",
    title: title,
  };
}

function parseLinkRow(line) {
  return line;
}
