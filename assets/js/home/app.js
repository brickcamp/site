import * as appState from "./state.js";
import * as appView from "./view.js";
import * as appData from "./data.js";
import * as appScope from "./scope.js";
import * as _ from "./utils.js";

let state;
let scopedEntries;
let scopedParts;

document.addEventListener("DOMContentLoaded", async () => {
  await appScope.load();
  state = appState.load();
  appView.init();
  await refreshAll();
});

window.addEventListener("popstate", async () => {
  state = appState.load();
  await refreshAll();
});

export async function dispatch(patch) {
  state = appState.save({ ...state, ...patch });

  if (_.hasAnyKeysIn(patch, ["base", "type", "value", "part", "sort"])) {
    await refreshScopedEntries();
  } else {
    refreshResults();
  }

  if (patch["queryPending"] === false) {
    refreshSearchField();
  }
}

async function refreshAll() {
  refreshSearchField();
  await refreshScopedEntries();
}

function refreshSearchField() {
  appView.renderSearchField(state);
}

function refreshResults() {
  if (appScope.scopeFor(state).isPartList) {
    const searchedParts = _.filterBySearch(scopedParts, state.query);
    appView.renderEntries([]);
    appView.renderParts(searchedParts);
  } else {
    const filteredEntries = _.filterByFieldValue(scopedEntries, "size", state.size);
    const searchedEntries = _.filterBySearch(filteredEntries, state.query);
    appView.renderEntries(searchedEntries);
    appView.renderParts(scopedParts);
  }

  appView.renderScopeTabs(state);
  appView.renderFilterDropdowns(state);
}

async function refreshScopedEntries() {
  if (appScope.scopeFor(state).isPartList) {
    scopedEntries = [];
  } else {
    const [sortedLinks, filteredEntries] = await Promise.all([
      appData.getSortedEntryLinks(state),
      appData.getFilteredEntries(state),
    ]);
    scopedEntries = _.sortByFieldValues(filteredEntries, "link", sortedLinks);
  }

  scopedParts = await appData.getParts(state);
  refreshResults();
}