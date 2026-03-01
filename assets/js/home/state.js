import * as appUrl from "./url.js";

const TAGS = {
  ANY: "__any",
  EMPTY: "",
  SORT_DEFAULT: "date-desc",

  BASES_WITHOUT_TYPES: ["__any", "part"],
  BASES_WITHOUT_VALUES: ["__any", "part", "repeat", "size"],
  TYPES_WITHOUT_VALUES: ["ellipse", "circle", "sphere", "toroid"],
};

export const DEFAULTS = Object.freeze({
  base: TAGS.ANY,
  type: TAGS.ANY,
  value: TAGS.ANY,
  part: TAGS.EMPTY,
  size: TAGS.ANY,
  sort: TAGS.SORT_DEFAULT,
  query: TAGS.EMPTY,
  hasTypes: true,
  hasValues: true,
});

export function save(rawState) {
  const state = normalize(rawState);
  appUrl.replaceState(state, DEFAULTS);
  return state;
}

export function load() {
  const rawState = appUrl.getState(DEFAULTS)
  return normalize(rawState, DEFAULTS);
}

export function normalize(input) {
  let result = { ...DEFAULTS, ...input };

  const normalizedQuery = result.query.trim().toLowerCase().replace(/\s+/g,' ');
  if (normalizedQuery !== result.query) {
    result = { ...result, query: normalizedQuery };
  }

  result.hasTypes = !TAGS.BASES_WITHOUT_TYPES.includes(result.base);
  result.hasValues = 
    !TAGS.BASES_WITHOUT_VALUES.includes(result.base) &&
    !TAGS.TYPES_WITHOUT_VALUES.includes(result.type);

  if (!result.type || !result.hasTypes) {
    result = { ...result, type: TAGS.ANY };
  }

  if (!result.value || !result.hasValues) {
    result = { ...result, value: TAGS.ANY };
  }

  return result;
}
