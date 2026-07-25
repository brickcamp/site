// What the current search scope supports, and what its dropdown entries are called.

export const ANY = "__any";

const CATALOG_URL = "/data/scopes/index.json";

const EMPTY_SCOPE = {
  slug: ANY,
  from: "",
  valueFormat: "",
  types: new Map(),
  values: new Map(),
};

let dimensions = {};
let scopes = new Map();

// Takes the catalog as plain data, so callers can be exercised without a fetch.
export function init(catalog) {
  dimensions = catalog.dimensions ?? {};
  scopes = new Map(
    (catalog.scopes ?? []).map((scope) => [
      scope.slug,
      {
        ...scope,
        types: new Map(scope.types.map((type) => [type.slug, type])),
        values: new Map(scope.values.map((value) => [value.slug, value])),
      },
    ]),
  );
}

export async function load(url = CATALOG_URL) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("scope catalog missing: " + url);
  }
  init(await res.json());
}

export function sortDefault() {
  return dimensions.sort?.default ?? "";
}

export function scopeFor(state) {
  const scope = scopes.get(state.base) ?? EMPTY_SCOPE;
  const type = scope.types.get(state.type);

  // The part list is its own mode: parts are shown instead of entries, 
  // so the dimensions that describe entries have nothing to act on.
  const isPartList = scope.from === "parts" && state.part === ANY;

  return {
    hasTypes: scope.types.size > 0,
    hasValues:
      scope.values.size > 0 && (state.type === ANY || type?.hasValues !== false),
    hasParts: scope.from === "parts",
    hasSize: !isPartList,
    hasSort: !isPartList,
    isPartList: isPartList,
    labelFor: (dimension, value) => labelFor(scope, dimension, value),
  };
}

function labelFor(scope, dimension, value) {
  if (dimension === "sort") {
    return optionTitle(dimension, value);
  }
  if (value === ANY) {
    return dimensions[dimension]?.anyTitle ?? value;
  }
  if (dimension === "size") {
    return optionTitle(dimension, value);
  }
  if (dimension === "type") {
    return scope.types.get(value)?.title ?? value;
  }
  if (dimension === "value") {
    return scope.values.get(value)?.title ?? formatValue(scope, value);
  }
  return value;
}

function optionTitle(dimension, value) {
  const options = dimensions[dimension]?.options ?? [];
  return options.find((option) => option.slug === value)?.title ?? value;
}

// Entries carry values not in the dropdown lists,
// so an unlisted value is labelled with the scope's format string instead.
function formatValue(scope, value) {
  return scope.valueFormat ? scope.valueFormat.replace("%s", value) : value;
}
