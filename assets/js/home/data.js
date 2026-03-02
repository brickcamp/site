import * as _ from "./utils";

const cache = new Map();

async function fetchCSV(url, mapFields = false) {
  if (cache.has(url)) {
    return cache.get(url)
  };

  const res = await fetch(url);
  const text = await res.text();
  let data = text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (!Array.isArray(data)) {
    data = [data];
  } else if (mapFields) {
    data = data
      .map(line => line.split(","))
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
  const filter = [state.base, state.type, state.value].join("-");
  return await fetchCSV("/data/filtered/" + filter + "/index.csv", mapEntryFields);
}

async function getPartEntries(state) {
  return await fetchCSV("/parts/" + state.part + "/index.csv", mapEntryFields);
}

function mapEntryFields(fields) {
  return {
    link: fields[0],
    image: fields[0] + "__image-min.webp",
    title: fields[1],
    size: fields[2],
  };
}

function mapPartFields(fields) {
  return {
    id: fields[0],
    link: "#",
    image: "/parts/" + fields[0] + "/image.jpg",
    title: fields[1],
  };
}
