import * as appUrl from "./url.js";
import * as appScope from "./scope.js";

function defaults() {
  return {
    base: appScope.ANY,
    type: appScope.ANY,
    value: appScope.ANY,
    part: appScope.ANY,
    size: appScope.ANY,
    sort: appScope.sortDefault(),
    query: "",
    queryPending: false,
  };
}

// Applies a patch, plus the rules that span across dimensions.
// Kept here rather than in the controls, so every caller gets them.
export function next(previous, patch) {
  let result = { ...previous, ...patch };

  // Reset base-specific state on switching base
  if ("base" in patch) {
    result = { ...result, type: appScope.ANY, value: appScope.ANY, part: appScope.ANY };
  }

  // Reset search when it switches between parts and entries
  const opensPartList = "base" in patch && appScope.scopeFor(result).isPartList;
  if ("part" in patch || opensPartList) {
    result = { ...result, query: "", queryPending: false };
  }

  return result;
}

export function save(rawState) {
  const state = normalize(rawState);
  if (rawState.queryPending) {
    appUrl.replaceState(state, defaults());
  } else {
    appUrl.pushState(state, defaults());
  }
  return state;
}

export function load() {
  return normalize(appUrl.getState(defaults()));
}

// Resets the dimensions the scope does not support, so switching scope — or
// hand-editing the URL — cannot leave a filter behind that nothing can clear.
// Each step re-asks the catalog because the previous one may have changed the
// answer: clearing the type can bring the value dropdown back.
export function normalize(input) {
  let result = { ...defaults(), ...input };

  const query = result.query.trim().toLowerCase().replace(/\s+/g, " ");
  if (query !== result.query) {
    result = { ...result, query: query };
  }

  if (!result.type || !appScope.scopeFor(result).hasTypes) {
    result = { ...result, type: appScope.ANY };
  }

  if (!result.value || !appScope.scopeFor(result).hasValues) {
    result = { ...result, value: appScope.ANY };
  }

  if (!appScope.scopeFor(result).hasSize) {
    result = { ...result, size: appScope.ANY, sort: defaults().sort };
  }

  return result;
}
