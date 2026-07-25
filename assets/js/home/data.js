import * as _ from "./utils.js";

const cache = new Map();

async function fetchCSV(url, mapFields = false) {
  if (cache.has(url)) {
    return cache.get(url)
  };

  const res = await fetch(url);
  if (!res.ok) {
    cache.set(url, []);
    return [];
  }

  const text = await res.text();
  let data = text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (!Array.isArray(data)) {
    data = [data];
  } else if (mapFields) {
    data = data
      .map(line => line.split("\t"))
      .map(mapFields);
  }
    
  cache.set(url, data);
  return data;
}

export async function getSortedEntryLinks(state) {
  if (state.sort == "random") {
    return _.shuffle(await fetchCSV("/data/sorted/title-asc/index.csv"));
  } else {
    return await fetchCSV("/data/sorted/" + state.sort + "/index.csv");
  }
}

export async function getFilteredEntries(state) {
  if (state.part == "__any") {
    return await getTagEntries(state);
  } else {
    return await getPartEntries(state);
  } 
}

export async function getParts(state) {
  if (state.base !== "part") {
    return [];
  }

  const parts = await fetchCSV("/parts/index.csv", mapPartFields);
  if (state.part == "__any") {
    return parts;
  } else {
    const part = parts.find(part => part.id === state.part)
    return part ? [part] : [];
  }
}

async function getTagEntries(state) {
  const filter = [state.base, state.type, "__any"].join("-");
  const entries = await fetchCSV("/data/filtered/" + filter + "/index.csv", mapEntryFields);
  if (state.value === "__any") {
    return entries;
  }
  return entries.filter(entry => entry.values.includes(state.value));
}

async function getPartEntries(state) {
  return await fetchCSV("/parts/" + state.part + "/index.csv", mapEntryFields);
}

// Entry rows are written by layouts/_partials/entries/getLookupRow.html,
// so change columns there and here together.
function mapEntryFields([link, title, size, values]) {
  return {
    link: link,
    image: link + "__image-min.webp",
    title: title,
    size: size,
    values: values ? values.split("|") : [],
  };
}

// Part rows are written by layouts/parts/taxonomy.csv.
function mapPartFields([id, title]) {
  return {
    id: id,
    link: "#",
    image: "/parts/" + id + "/__image-min.webp",
    title: title,
  };
}
