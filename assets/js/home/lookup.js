// The entry lookup: 
// Fetch lookup files, convert them to entries and sort/filter/search them.

import { ANY, scopeFor } from "./scope.js";

const PARTS_URL = "/parts/index.csv";
const GROUPS_URL = "/partgroups/index.csv";
const TITLE_ORDER_URL = "/data/sorted/title-asc/index.csv";

const cache = new Map();

let fetchFile = (url) => fetch(url);

// The only injected dependency, so the lookup can be exercised without a network.
export function useFetch(fn) {
  fetchFile = fn;
  cache.clear();
}

export async function scopedEntries(state) {
  if (!scopeFor(state).hasEntries) {
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

  // Listing parts is the one mode in which the search box acts on parts.
  if (state.partgroup !== ANY) {
    const members = parts.filter((part) => part.partgroup === state.partgroup);
    return bySearch(members, state.query);
  }

  // Matching single parts are not shown, if they are part of a matching group
  const groups = bySearch(await fetchRows(GROUPS_URL, parseGroupRow), state.query);
  const covered = new Set(groups.map((group) => group.id));
  const loose = bySearch(parts, state.query).filter((part) => !covered.has(part.partgroup));
  return [...groups, ...loose].sort((a, b) => a.title.localeCompare(b.title));
}

// The way back out of an open group or part, as crumbs. Each is a control
// carrying the one dimension that leads to it; state.js does the rest, since
// picking a group clears the part.
export async function scopedTrail(state) {
  if (!scopeFor(state).hasParts || (state.part === ANY && state.partgroup === ANY)) {
    return [];
  }

  const parts = await fetchRows(PARTS_URL, parsePartRow);
  const part = parts.find((candidate) => candidate.id === state.part);

  // A hand-edited URL can name a group that does not hold the part. The part's
  // own group is the truth, so that going up goes where the list came from.
  const groups = await fetchRows(GROUPS_URL, parseGroupRow);
  const wanted = part ? part.partgroup : state.partgroup;
  const group = groups.find((candidate) => candidate.id === wanted);

  const trail = [{ title: "All parts", dim: "partgroup", value: ANY }];
  if (group) {
    trail.push({ title: group.title, dim: "partgroup", value: group.id });
  }
  if (part) {
    trail.push({ title: part.title, dim: "part", value: part.id });
  }
  return trail;
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

  if (state.partgroup !== ANY) {
    return fetchRows("/partgroups/" + state.partgroup + "/index.csv", parseEntryRow);
  }

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

// Dimensions are titled '1 x 2', but sometimes typed '1x2'. Collapsing them on both sides 
// lets either form find either, also mid-word so results don't blink out between keystrokes.
const forSearch = (text) => text.toLowerCase().replace(/(\d)\s*[x×]\s*/g, "$1x");

function bySearch(objects, search) {
  if (!search) {
    return objects;
  }
  const needle = forSearch(search);
  return objects.filter((obj) => forSearch(obj.title).includes(needle));
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
  const [id, title, partgroup] = line.split("\t");
  return {
    id: id,
    dim: "part",
    link: "#",
    image: "/parts/" + id + "/__image-min.webp",
    title: title,
    partgroup: partgroup ?? "",
  };
}

// Group rows are written by layouts/partgroups/taxonomy.csv. A group has no
// image of its own — the row names the member's it borrows.
function parseGroupRow(line) {
  const [id, title, count, image] = line.split("\t");
  return {
    id: id,
    dim: "partgroup",
    link: "#",
    image: image,
    title: title,
    note: count === "1" ? "1 part" : count + " parts",
  };
}

function parseLinkRow(line) {
  return line;
}
