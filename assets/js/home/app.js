import * as appState from "./state.js";
import * as appView from "./view.js";
import * as appData from "./data.js";
import * as _ from "./utils.js";

let state;
let scopedEntries;

document.addEventListener("DOMContentLoaded", async () => {
  state = appState.load();
  appView.init();
  await refreshAll();
});

document.addEventListener("popstate", async () => {
  state = appState.load();
  await refreshAll();
});

export async function dispatch(patch) {
  state = appState.save({ ...state, ...patch });

  if (_.hasAnyKeysIn(patch, ["base", "type", "value", "sort"])) {
    await refreshScopedEntries();
  } else {
    refreshResults();
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
  const filtered = _.filterByFieldValue(scopedEntries, "size", state.size);
  const searched = _.filterBySearch(filtered, state.query);
  appView.renderEntries(searched);
  appView.renderScopeTabs(state);
  appView.renderFilterDropdowns(state);
}

async function refreshScopedEntries() {
  const [sortedLinks, filteredEntries] = await Promise.all([
    appData.getSortedEntryLinks(state),
    appData.getFilteredEntries(state),
  ]);
  
  scopedEntries = _.sortByFieldValues(filteredEntries, "link", sortedLinks);
  refreshResults();
}