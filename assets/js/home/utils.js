
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function sortByFieldValues(objects, field, sortedValues) {
  const indexMap = new Map(sortedValues.map((v, i) => [v, i]));
  return objects
    .filter(obj => indexMap.has(obj[field]))
    .sort((a, b) => indexMap.get(a[field]) - indexMap.get(b[field]));
}

export function filterByFieldValue(objects, field, value) {
  if (!value || value === "__any") {
    return objects;
  } else {
    return objects.filter((entry) => entry[field] === value);
  }
}

export function filterBySearch(objects, search) {
  if (search) {
    return objects.filter((entry) => entry.title.toLowerCase().includes(search));
  } else {
    return objects;
  }
}

export function orAny(value) {
  return value || "__any";
}

export function hasAnyKeysIn(object, keys) {
  return Object.keys(object).some((key) => keys.includes(key));
}

export function hasOnlyKeysIn(object, keys) {
  return Object.keys(object).every(key => keys.includes(key));
}