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
  }

  if (mapFields) {
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
  const filter = [state.base, state.type, state.value].join("-");
  return await fetchCSV("/data/filtered/" + filter + "/index.csv", mapFilterFields);
}

function mapFilterFields(fields) {
  return {
    link: fields[0],
    image: fields[0] + "__image-min.webp",
    title: fields[1],
    size: fields[2],
  };
}
